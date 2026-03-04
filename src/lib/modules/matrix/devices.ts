import type { MatrixClient } from 'matrix-js-sdk'

export async function all (client: MatrixClient) {
  const userID = client.getSafeUserId()

  return [...(await client.getCrypto()!.getUserDeviceInfo([userID], true)).get(userID)?.values() ?? []].filter(d => {
    return !d.dehydrated && !!d.getIdentityKey()
  })
}

export async function verified (client: MatrixClient, deviceId?: string | null) {
  if (!deviceId) return false

  const trustLevel = await client.getCrypto()?.getDeviceVerificationStatus(client.getSafeUserId(), deviceId)
  if (!trustLevel) return false

  return trustLevel.crossSigningVerified
}

export function currentverified (client: MatrixClient) {
  return verified(client, client.getDeviceId())
}
