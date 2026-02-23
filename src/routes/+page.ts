import { redirect } from '@sveltejs/kit'
import { get } from 'svelte/store'

import { currentverified } from '$lib/modules/matrix/devices'
import { parse } from '$lib/modules/matrix/user'
import { session } from '$lib/state'

export async function load ({ parent }) {
  const { client } = await parent()

  const sess = get(session)
  if (!sess || !client) redirect(307, '/#/auth/')

  const baseUrl = sess.home_server ?? parse(sess.user_id)?.server
  if (!baseUrl) {
    session.set(null)
    redirect(307, '/#/auth/')
  }

  return { client, verified: await currentverified(client.matrix) }
}
