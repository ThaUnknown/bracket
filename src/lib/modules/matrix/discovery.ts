import { AutoDiscovery } from 'matrix-js-sdk'
import { get } from 'svelte/store'

import { wellknown } from '$lib/state'

export async function baseURL (server: string) {
  try {
    const json = getCachedConfig(server) ?? await AutoDiscovery.findClientConfig(server)

    if (!json['m.homeserver']?.base_url) {
      throw new Error('Invalid Matrix discovery response: missing m.homeserver.base_url')
    }

    return json['m.homeserver'].base_url
  } catch (err) {
    console.warn(err)
    return new URL(server).toString()
  }
}

function getCachedConfig (server: string) {
  const config = get(wellknown)
  if (config?.['m.homeserver']?.base_url?.includes(server)) return config
  return null
}
