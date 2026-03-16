import { error } from '@sveltejs/kit'

export async function load ({ params, parent }) {
  const { client } = await parent()

  const server = await client.loadroom(params.serverId)

  if (!server) return error(404, 'Server not found')

  const hierarchy = client.hierarchy(server.roomId)

  return { server, hierarchy }
}
