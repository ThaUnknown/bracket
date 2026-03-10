import { error } from '@sveltejs/kit'
import { Direction, EventType, TimelineWindow } from 'matrix-js-sdk'

const NUM_PRELOAD_MESSAGES = 30

export async function load ({ parent, params }) {
  const { client } = await parent()

  const room = await client.room(params.roomId)

  if (!room) return error(404, 'Room not found')

  const window = new TimelineWindow(client.matrix, room.getUnfilteredTimelineSet(), { windowLimit: 100 })
  window.load(room.getAccountData(EventType.FullyRead)?.getContent().event_id, NUM_PRELOAD_MESSAGES).then(() => {
    // @ts-expect-error private field
    const eventCount = window.eventCount + 1
    if (eventCount < NUM_PRELOAD_MESSAGES) {
      return window.paginate(Direction.Backward, NUM_PRELOAD_MESSAGES - eventCount)
    }
  })

  return { room, window }
}
