// if you're thinking about using global state, think again
import { set } from 'idb-keyval'
import { derived } from 'svelte/store'
import { persisted } from 'svelte-persisted-store'

import type { IClientWellKnown, LoginResponse } from 'matrix-js-sdk'

export const session = persisted<LoginResponse | null>('session', null)

export const wellknown = persisted<IClientWellKnown | null>('wellknown', null)

derived([session, wellknown], ([$session, $wellknown]) => {
  if (!$session?.access_token || !$wellknown?.['m.homeserver']?.base_url) return

  return {
    accessToken: $session.access_token,
    origin: new URL($wellknown['m.homeserver'].base_url).origin
  }
}
).subscribe(async (auth) => {
  if (!navigator.serviceWorker) return

  await set('matrix-media-cache', auth)
  const registration = await navigator.serviceWorker.ready
  registration.active!.postMessage(auth)
})
