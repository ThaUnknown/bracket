import { getHttpUriForMxc } from 'matrix-js-sdk'

import type { EncryptedFile } from 'matrix-js-sdk/lib/types'

import { wellknown } from '$lib/state'

// this is kinda hacky, but i didn't have a better idea
let deref = ''

wellknown.subscribe(value => {
  if (!value?.['m.homeserver']?.base_url) return
  deref = value['m.homeserver'].base_url
})

export function mxcToHttp (mxc?: string, encrypted?: EncryptedFile, fileLength = 0): string {
  if (!mxc) return ''
  const http = getHttpUriForMxc(
    deref,
    mxc,
    undefined,
    undefined,
    undefined,
    true,
    true,
    true
  )

  if (!encrypted || !http) return http || mxc

  // Encode encrypted file metadata in search params
  const url = new URL(http)
  for (const key of ['v', 'key', 'iv', 'hashes'] as const) {
    url.searchParams.set(key, JSON.stringify(encrypted[key]))
  }
  url.searchParams.set('fileLength', fileLength.toString())

  return url.toString()
}
