import { redirect } from '@sveltejs/kit'
import { get } from 'svelte/store'
import { persisted } from 'svelte-persisted-store'

export async function load ({ parent }) {
  const { client } = await parent()

  const { dms } = get(client.roomtypes)
  const lastDM = get(persisted<string | undefined>('lastDM', undefined)) ?? dms.values().toArray().toSorted((a, b) => b.getLastActiveTimestamp() - a.getLastActiveTimestamp())[0]?.roomId

  if (lastDM) return redirect(307, `/#/app/dm/${lastDM}`)
}
