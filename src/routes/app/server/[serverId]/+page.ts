import { redirect } from '@sveltejs/kit'

export function load ({ params }) {
  return redirect(307, '/#/app/server/' + params.serverId + '/' + params.serverId)
}
