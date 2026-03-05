import { get } from 'idb-keyval'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim, skipWaiting } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { RangeRequestsPlugin } from 'workbox-range-requests'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

import type { EncryptedFile } from 'matrix-js-sdk/lib/types'

import { createDecryptionStream, parseRangeHeader } from '$lib/modules/matrix/attachment/crypto'
import { build, files, prerendered, version } from '$service-worker'

//
// Offline mode handling
//

const directoryIndex = '/offline.html'

precacheAndRoute([...prerendered, ...build, ...files].map(url => ({ url, revision: version })), { directoryIndex })
cleanupOutdatedCaches()
clientsClaim()
skipWaiting()

// registerRoute(new Route(({ request }) => request.mode === 'navigate',
//   new NetworkOnly({
//     plugins: [new PrecacheFallbackPlugin({ fallbackURL: FALLBACK_URL }),
//       {
//         async fetchDidSucceed ({ response }) {
//           if (response.ok) return response

//           return await matchPrecache(FALLBACK_URL) ?? response
//         }
//       }]
//   })
// ))

self.__WB_DISABLE_DEV_LOGS = true
//
// Matrix asset handling
//

const cacheName = 'matrix-media-cache'

let session = get<{ accessToken: string, origin: string } | undefined>(cacheName)

addEventListener('message', async ({ data }) => {
  if (data?.origin && data.accessToken) session = data
  if (data?.type === 'LOGOUT') {
    // TODO: handle logout on client!
    caches.delete(cacheName)
  }
})

const PATHNAMES = ['/_matrix/client/v1/media/download', '/_matrix/client/v1/media/thumbnail']

const contentLength = (res: Response) => parseInt(res.headers.get('Content-Length') ?? '0')
const makeHeaders = (req: Request, auth?: string) => {
  const newHeaders = new Headers(req.headers)
  if (auth) newHeaders.set('Authorization', `Bearer ${auth}`)
  return newHeaders
}

// don't cache video, but handle decryption for all media, authorized or not.
registerRoute(
  ({ url }) => PATHNAMES.some(path => url.pathname.startsWith(path)),
  new CacheFirst({
    cacheName,
    plugins: [
      {
        async requestWillFetch ({ request, state }) {
          const awaited = await session

          // strip encryption params
          const url = new URL(request.url)
          const hasParams = url.search.length > 2
          const encryptedParam = Object.fromEntries(
            url.searchParams.entries().map(([key, value]) => [key, JSON.parse(value)])
          ) as EncryptedFile & { fileLength?: number }
          url.search = '?allow_redirect=true'

          // some clients don't include the file length in the encrypted file info, so we need to fetch it ourselves if it's missing, if they do then we can skip this step which saves a network request and speeds up the response time
          if (hasParams && !encryptedParam.fileLength) {
            const headers = makeHeaders(request, awaited?.accessToken)
            headers.delete('Range')
            encryptedParam.fileLength = contentLength(await fetch(url, { method: 'HEAD', headers }))
          }

          // handle authorization
          const headers = makeHeaders(request, awaited?.accessToken)

          // override range headers if encryption is used
          const range = parseRangeHeader(headers.get('Range'))
          if (range && hasParams) headers.set('Range', `bytes=${range.blockStart}-${range.blockEnd ?? ''}`)

          // store necessary state for later steps
          if (hasParams) state!.encryptedParam = encryptedParam
          state!.range = range
          state!.destination = request.destination

          return new Request(url, { headers })
        },
        async cacheWillUpdate ({ response, state }) {
          return state?.destination !== 'video' ? response : null
        },
        async fetchDidSucceed ({ response, state }) {
          // no encryption so can be returned as is
          const encryptedParam: (EncryptedFile & { fileLength: number }) | undefined = state?.encryptedParam
          if (!encryptedParam) return response

          const headers = new Headers(response.headers)
          headers.set('Accept-Ranges', 'bytes')

          let decrypt: TransformStream<Uint8Array, Uint8Array>

          // handle encrypted responses with range requests
          const range: ReturnType<typeof parseRangeHeader> = state?.range
          if (range && response.status === 206) {
            headers.delete('Content-Length')
            // we had to modify the range request to align with AES blocks, so we need to adjust the content range header in the response to match the original request
            headers.set('Content-Range', `bytes ${range.originalStart}-${range.originalEnd ?? (range.blockStart + contentLength(response) - 1)}/${encryptedParam.fileLength}`)

            decrypt = createDecryptionStream(
              encryptedParam,
              range.blockStart,
              range.originalStart - range.blockStart,
              range.originalEnd ? range.originalEnd - range.originalStart + 1 : undefined,
              false
            )
          } else {
            decrypt = createDecryptionStream(encryptedParam, 0)
          }

          return new Response(response.body?.pipeThrough(decrypt), {
            status: response.status,
            headers
          })
        }
      },
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new RangeRequestsPlugin(),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 3 * 24 * 60 * 60, // 3 days
        purgeOnQuotaError: true
      })
    ]
  })
)
