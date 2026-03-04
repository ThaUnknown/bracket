import { redirect } from '@sveltejs/kit'

export async function load ({ parent }) {
  const { client } = await parent()

  if (!client) return redirect(307, '/#/')

  return { client }
}
