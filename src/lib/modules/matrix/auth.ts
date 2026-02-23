import type { MatrixError, MatrixClient, UserIdentifier, LoginResponse } from 'matrix-js-sdk'

import { page } from '$app/state'
import { session } from '$lib/state'

const INITIAL_DISPLAY_NAME = 'Bracket'

export interface Session {
  accessToken: string
  deviceId: string
  userId: string
  baseUrl: string
}

function authPopup<T> (url: URL | string, callback: (data: { hash: string, search: string }) => T | undefined) {
  const popup = open(url, 'authframe', 'popup,width=390,height=620')
  return new Promise<T>((resolve, reject) => {
    if (!popup) return reject(new Error('Failed to open popup'))
    const destroy = (err: Error) => {
      channel.close()
      clearTimeout(timeout)
      reject(err)
      popup.close()
    }
    const timeout = setTimeout(() => destroy(new Error('Authentication timed out')), 5 * 60 * 1000) // 5 minutes
    const channel = new BroadcastChannel('bracket-auth')
    channel.onmessage = ({ data }) => {
      const res = callback(data)
      if (!res) return
      resolve(res)
      destroy(new Error('Authentication succeeded'))
    }
  })
}

function makesession (response: LoginResponse) {
  session.set(response)
  return response
}

export async function sso (client: MatrixClient) {
  const url = client.getSsoLoginUrl(new URL('/#/auth/popup/', page.url).toString(), 'sso')

  const { loginToken } = await authPopup(url, ({ search }) => {
    if (!search.startsWith('?loginToken=')) return
    return Object.fromEntries(new URLSearchParams(search).entries()) as { loginToken: string }
  })

  return makesession(await client.loginRequest({ token: loginToken, type: 'm.login.token', initial_device_display_name: INITIAL_DISPLAY_NAME }))
}

export function password (client: MatrixClient, user: string, password: string) {
  const login = async (identifier: UserIdentifier) => {
    return makesession(await client.loginRequest({ identifier, password, type: 'm.login.password', initial_device_display_name: INITIAL_DISPLAY_NAME }))
  }

  if (!user.startsWith('@') && user.includes('@')) return login({ type: 'm.id.thirdparty', medium: 'email', address: user })

  return login({ type: 'm.id.user', user })
}

export async function register (client: MatrixClient, username: string, password: string) {
  return makesession(await client.registerRequest({ username, password, initial_device_display_name: INITIAL_DISPLAY_NAME }) as LoginResponse)
}

export async function registration (client: MatrixClient) {
  try {
    await client.registerRequest({})
  } catch (err) {
    const { httpStatus } = err as MatrixError
    if (httpStatus === 401) return true
    if (httpStatus === 403) return false
    throw err
  }
}
