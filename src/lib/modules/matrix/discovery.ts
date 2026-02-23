import { AutoDiscovery, type IClientWellKnown } from 'matrix-js-sdk'

export async function baseURL (server: string) {
  try {
    const json = await AutoDiscovery.findClientConfig(server)

    if (!json['m.homeserver']?.base_url) {
      throw new Error('Invalid Matrix discovery response: missing m.homeserver.base_url')
    }

    return json['m.homeserver'].base_url
  } catch (err) {
    console.warn(err)
    try {
      return getCachedConfig(server)?.['m.homeserver']?.base_url || new URL(server).toString()
    } catch (err) {
      console.warn(err)
      return new URL(server).toString()
    }
  }
}

export function cacheConfig (config: IClientWellKnown) {
  localStorage.setItem('matrixConfig', JSON.stringify(config))
}

function getCachedConfig (server: string) {
  const config = localStorage.getItem('matrixConfig')
  if (!config) return null
  const parsed = JSON.parse(config) as IClientWellKnown
  if (parsed['m.homeserver']?.base_url?.includes(server)) return parsed
  return null
}
