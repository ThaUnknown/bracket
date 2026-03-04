import { type MatrixClient, type MatrixEvent, RoomEvent, type Room, RoomType, EventType, RoomStateEvent, RoomMemberEvent, type RoomMember, type ReceiptCache, RelationType, MsgType, type EventTimelineSet } from 'matrix-js-sdk'
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

export function messages (liveevents: ReturnType<typeof live>) {
  return derived(liveevents, $live => {
    // return $live.filter((e): e is TypedMatrixEvent<'m.room.message' | 'm.sticker'> => {
    //   const type = e.getType()
    //   return (type === 'm.room.message' || type === 'm.sticker') && e.getContent()['m.relates_to']?.rel_type !== 'm.replace'
    // })
    // filter message and sticker events, and aggregate other events as "children of the latest message"
    const messages: Array<[TypedMatrixEvent<'m.room.message' | 'm.sticker'>, string[]]> = []
    for (const e of $live) {
      const type = e.getType()
      if ((type === 'm.room.message' || type === 'm.sticker') && e.getContent()['m.relates_to']?.rel_type !== 'm.replace') {
        messages.push([e as TypedMatrixEvent<'m.room.message' | 'm.sticker'>, []])
      } else if (messages.length) {
        messages.at(-1)![1].push(e.getId()!)
      }
    }
    return messages
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

export function reactions (liveevents: ReturnType<typeof live>, eventId: string | undefined, set: EventTimelineSet) {
  return derived(liveevents, () => {
    return (set.relations.getChildEventsForEvent(eventId!, RelationType.Annotation, EventType.Reaction)?.getRelations() ?? []) as Array<TypedMatrixEvent<EventType.Reaction>>
  })
}
export function canEditEvent (event: TypedMatrixEvent<EventType.RoomMessage>, userId?: string) {
  const content = event.getContent()
  const relationType = content['m.relates_to']?.rel_type
  const msgtype = [MsgType.Text, MsgType.Emote, MsgType.Notice].includes(content.msgtype)
  return (
    (!relationType || relationType === 'm.thread') &&
    event.getSender() === userId &&
    msgtype
  )
}

export function getLatestEditableEvt (messages: Array<TypedMatrixEvent<EventType.RoomMessage>>) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const evt = messages[i]!
    if (canEditEvent(evt)) return evt
  }
}

export function encryption (room: Room) {
  return readable(room.hasEncryptionStateEvent(), set => {
    const update = () => set(room.hasEncryptionStateEvent())
    room.addListener(RoomStateEvent.Update, update)
    return () => room.removeListener(RoomStateEvent.Update, update)
  })
}
