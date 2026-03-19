import { error } from '@sveltejs/kit'
import { Direction, EventType, TimelineWindow } from 'matrix-js-sdk'

const NUM_PRELOAD_MESSAGES = 50

async function preload (window: TimelineWindow, initial: string) {
  try {
    await window.load(initial, NUM_PRELOAD_MESSAGES)
  } catch (error) {
    if (initial) await window.load(undefined, NUM_PRELOAD_MESSAGES)
  }

  // @ts-expect-error private field
  const eventCount = window.eventCount + 1
  if (eventCount < NUM_PRELOAD_MESSAGES) {
    await window.paginate(Direction.Backward, NUM_PRELOAD_MESSAGES - eventCount)
  }
}

export async function load ({ parent, params }) {
  const { client } = await parent()

  const room = await client.loadroom(params.roomId)

  if (!room) return error(404, 'Room not found')

  const window = new TimelineWindow(client.matrix, room.getUnfilteredTimelineSet(), { windowLimit: 300 })

  preload(window, room.getAccountData(EventType.FullyRead)?.getContent().event_id)

  return { room, window }
}
