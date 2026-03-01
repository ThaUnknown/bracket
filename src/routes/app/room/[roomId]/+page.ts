import { error } from '@sveltejs/kit'

const NUM_PRELOAD_MESSAGES = 30

export async function load ({ parent, params }) {
  const { client } = await parent()

  const room = await client.room(params.roomId)

  if (!room) return error(404, 'Room not found')

  const eventCount = room.getLiveTimeline().getEvents().length

  if (eventCount < NUM_PRELOAD_MESSAGES) {
    client.matrix.scrollback(room, NUM_PRELOAD_MESSAGES - eventCount)
  }

  return { room }
}
