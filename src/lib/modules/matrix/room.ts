import { type MatrixEvent, RoomEvent, type Room, MatrixEventEvent, RoomType, EventType } from 'matrix-js-sdk'
import { readable } from 'simple-store-svelte'

export function messages (room: Room) {
  return readable(room.getLiveTimeline().getEvents(), set => {
    const timeline = room.getLiveTimeline()
    const update = (event: MatrixEvent) => {
      if (event.getType() === 'm.room.encrypted') {
        event.once(MatrixEventEvent.Decrypted, () => {
          // TODO: NO!! this is really bad, we should only update the single event, not the entire timeline, there needs to be an "event" component that listens for changes to the event and updates itself
          // there's also some client.decryptEventIfnecssary or smth like that, maybe use that?
          set(timeline.getEvents())
        })
      }
      set(timeline.getEvents())
    }

    room.on(RoomEvent.Timeline, update)
    room.on(RoomEvent.Redaction, update)

    return () => {
      room.off(RoomEvent.Timeline, update)
      room.off(RoomEvent.Redaction, update)
    }
  })
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
