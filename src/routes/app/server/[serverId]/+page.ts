import { error } from '@sveltejs/kit'

export async function load ({ params, parent }) {
  const { client } = await parent()

  const hierarchy = client.hierarchy(params.serverId)

  const server = await client.room(params.serverId)
  if (!server) return error(404, 'Room not found')

  return { server, hierarchy }
}
