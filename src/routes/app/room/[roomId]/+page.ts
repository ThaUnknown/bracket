import { error } from '@sveltejs/kit'

export async function load ({ parent, params }) {
  const { client } = await parent()

  const room = await client.room(params.roomId)

  if (!room) return error(404, 'Room not found')

  const eventCount = room.getLiveTimeline().getEvents().length

  if (eventCount < 50) {
    client.matrix.scrollback(room, 50 - eventCount)
  }

  return { room }
}
