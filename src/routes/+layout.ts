import { redirect } from '@sveltejs/kit'
import { get } from 'svelte/store'

import { MatrixChatClient } from '$lib/modules/matrix/client'
import { baseURL } from '$lib/modules/matrix/discovery'
import { parse } from '$lib/modules/matrix/user'
import { session } from '$lib/state'

// TODO: this should be handled better? this is done to make client non-optional, but it's routes that should protect against no client
export const load = async ({ untrack, url }) => {
  if (untrack(() => !url.hash || url.pathname !== '/')) return redirect(307, '/#/')

  const sess = get(session)
  if (!sess) return

  const domain = parse(sess.user_id)?.server
  if (!domain) {
    session.set(null)
    return
  }

  console.log('creating client')

  return {
    client: await new MatrixChatClient(sess, await baseURL(domain))
  }
}
