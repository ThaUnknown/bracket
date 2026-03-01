import { type MatrixClient, type MatrixEvent, RoomEvent, type Room, RoomType, EventType, RoomStateEvent, RoomMemberEvent, type RoomMember, type ReceiptCache } from 'matrix-js-sdk'
import { derived, readable } from 'svelte/store'

import type { TypedMatrixEvent } from './event.ts'

import { MapWithDefault } from '$lib/utils'

// TODO: ignore this another time, filters overall shouldnt be used
// export function filtered (room: Room, filter: Filter) {
//   const timeline = room.getOrCreateFilteredTimelineSet(filter)
//   const live = timeline.getLiveTimeline()
//   return readable(live.getEvents(), set => {
//     const update = async (event: MatrixEvent) => {
//       await room.client.decryptEventIfNeeded(event)
//       set(live.getEvents())
//     }

//     timeline.on(RoomEvent.Timeline, update)

//     return () => {
//       timeline.off(RoomEvent.Timeline, update)
//     }
//   })
// }

export function live (room: Room, timelineset = room.getUnfilteredTimelineSet()) {
  let live = timelineset.getLiveTimeline()

  return readable(live.getEvents(), set => {
    const update = async (event?: MatrixEvent) => {
      // TODO is this good flow?
      if (event) await room.client.decryptEventIfNeeded(event)
      // TODO decryptAllEvents is SLOW as hell
      else await room.decryptAllEvents()
      set(live.getEvents())
    }
    const refresh = () => {
      const fresh = timelineset.getLiveTimeline()
      if (fresh !== live) {
        live = fresh
        update()
      }
    }

    update()

    room.on(RoomEvent.Redaction, update)
    room.on(RoomEvent.TimelineRefresh, refresh)
    timelineset.on(RoomEvent.Timeline, update)
    timelineset.on(RoomEvent.TimelineReset, refresh)

    return () => {
      room.off(RoomEvent.Redaction, update)
      room.off(RoomEvent.TimelineRefresh, refresh)
      timelineset.off(RoomEvent.Timeline, update)
      timelineset.off(RoomEvent.TimelineReset, refresh)
    }
  })
}

export function messages (room: Room, timelineset = room.getUnfilteredTimelineSet()) {
  return derived(live(room, timelineset), $live => {
    return $live.filter((e): e is TypedMatrixEvent<'m.room.message' | 'm.sticker'> => e.getType() === 'm.room.message' || e.getType() === 'm.sticker')
  })
}

export function pinned (room: Room) {
  const get = () => room.currentState.getStateEvents('m.room.pinned_events') as Array<TypedMatrixEvent<'m.room.pinned_events'>>

  return readable(get(), set => {
    const update = () => set(get())

    room.on(RoomStateEvent.Update, update)
    return () => room.off(RoomStateEvent.Update, update)
  })
}

export function typing (client: MatrixClient) {
  const typingByRoom = new MapWithDefault<string, Map<string, RoomMember>>(() => new Map())

  return readable(typingByRoom, set => {
    const update = (_: MatrixEvent, member: RoomMember) => {
      const room = typingByRoom.get(member.roomId)
      if (member.typing) {
        room.set(member.userId, member)
      } else {
        room.delete(member.userId)
      }

      set(typingByRoom)
    }

    client.on(RoomMemberEvent.Typing, update)

    return () => client.off(RoomMemberEvent.Typing, update)
  })
}

export function reads (room: Room) {
  // @ts-expect-error private field access, but performant
  const get = () => room.receiptCacheByEventId as ReceiptCache

  return readable(get(), set => {
    const update = () => set(get())

    update()

    room.on(RoomEvent.Receipt, update)

    return () => room.off(RoomEvent.Receipt, update)
  })
}

export function isVideo (room: Room) {
  return room.getType() === 'org.matrix.msc3417.call'
}

export function isRoom (room: Room) {
  return !isSpace(room)
}

export function isSpace (room: Room) {
  return room.getType() === RoomType.Space
}

export function spaceChildren (room: Room) {
  return room.currentState.getStateEvents(EventType.SpaceChild).reduce<string[]>((arr, e) => {
    if (!Array.isArray(e.getContent<{ via?: string[] }>().via)) return arr

    const key = e.getStateKey()
    if (key) arr.push(key)

    return arr
  }, [])
}
