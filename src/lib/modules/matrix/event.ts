import { getHttpUriForMxc, type AccountDataEvents, type EventType, type IContent, type MatrixEvent, type RoomAccountDataEvents, type StateEvents, type TimelineEvents } from 'matrix-js-sdk'
import { get } from 'svelte/store'

import type { EncryptedFile } from 'matrix-js-sdk/lib/types'

import { wellknown } from '$lib/state'

// this needs to work with both TypedMatrixEvent<EventType.RoomPinnedEvents> and TypedMatrixEvent<'m.room.pinned_events'>

type ContentEvents = StateEvents & TimelineEvents & AccountDataEvents & RoomAccountDataEvents

type EventTypeLike = EventType | `${EventType}`

export interface TypedMatrixEvent<T extends EventTypeLike = EventTypeLike> extends MatrixEvent {
  getType: () => T
  getContent: <Z = ContentEvents[Extract<keyof ContentEvents, T | `${T & EventType}`>] & IContent>() => Z
}

// TODO: calling get() so often is laggy, also this should *probably* be in another file?
export function mxcToHttp (mxc: string, encrypted?: EncryptedFile, fileLength = 0): string {
  const http = getHttpUriForMxc(
    get(wellknown)!['m.homeserver']!.base_url!,
    mxc,
    undefined,
    undefined,
    undefined,
    true,
    true,
    !!encrypted
  )

  if (!encrypted || !http) return http || mxc

  // Encode encrypted file metadata in search params
  const url = new URL(http)
  for (const key of ['v', 'key', 'iv'] as const) {
    url.searchParams.set(key, JSON.stringify(encrypted[key]))
  }
  url.searchParams.set('fileLength', fileLength.toString())

  return url.toString()
}
