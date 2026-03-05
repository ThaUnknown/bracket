import type { AccountDataEvents, EventType, IContent, MatrixEvent, RoomAccountDataEvents, StateEvents, TimelineEvents } from 'matrix-js-sdk'

// this needs to work with both TypedMatrixEvent<EventType.RoomPinnedEvents> and TypedMatrixEvent<'m.room.pinned_events'>

type ContentEvents = StateEvents & TimelineEvents & AccountDataEvents & RoomAccountDataEvents

type EventTypeLike = EventType | `${EventType}`

export interface TypedMatrixEvent<T extends EventTypeLike = EventTypeLike> extends MatrixEvent {
  getType: () => T
  getContent: <Z = ContentEvents[Extract<keyof ContentEvents, T | `${T & EventType}`>] & IContent>() => Z
}
