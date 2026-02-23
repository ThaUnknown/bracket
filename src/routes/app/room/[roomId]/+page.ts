import { error } from '@sveltejs/kit'

export async function load ({ parent, params }) {
  const { client } = await parent()

  const room = await client.room(params.roomId)

  if (!room) return error(404, 'Room not found')

  // TODO is this good flow?
  await room.decryptCriticalEvents()

  return { room }
}
