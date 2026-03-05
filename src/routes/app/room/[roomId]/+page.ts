import { error } from '@sveltejs/kit'
import { TimelineWindow } from 'matrix-js-sdk'

const NUM_PRELOAD_MESSAGES = 30

export async function load ({ parent, params }) {
  const { client } = await parent()

  const room = await client.room(params.roomId)

  if (!room) return error(404, 'Room not found')

  const window = new TimelineWindow(client.matrix, room.getUnfilteredTimelineSet())
  window.load(undefined, NUM_PRELOAD_MESSAGES)

  return { room, window }
}
