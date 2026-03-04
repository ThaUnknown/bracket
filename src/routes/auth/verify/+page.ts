import { redirect } from '@sveltejs/kit'

import type { SecretStorageKeyDescriptionAesV1 } from 'matrix-js-sdk/lib/secret-storage'

import { all } from '$lib/modules/matrix/devices'

export async function load ({ parent }) {
  const { client } = await parent()

  if (!client) redirect(307, '/#/auth/')

  let keyId: string | undefined
  let keyInfo: SecretStorageKeyDescriptionAesV1 | undefined
  const matrix = client.matrix

  const keys = await matrix.secretStorage.isStored('m.cross_signing.master')
  const keyIDs = keys && Object.entries(keys)
  // If the secret is stored under more than one key, we just pick an arbitrary one
  if (keyIDs?.length) {
    [keyId, keyInfo] = keyIDs[0]!
  }

  const crypto = matrix.getCrypto()!
  // this is kinda hacky, but I couldn't find a better way to await the initial OLM sync
  await crypto.userHasCrossSigningKeys(matrix.getSafeUserId(), true)

  // do we have any other verified devices which are E2EE which we can verify against?
  for (const device of await all(matrix)) {
    const verificationStatus = await crypto.getDeviceVerificationStatus(matrix.getSafeUserId(), device.deviceId)
    if (verificationStatus?.signedByOwner) return { keyId, keyInfo, hasDevicesToVerifyAgainst: true }
  }

  return { keyId, keyInfo, hasDevicesToVerifyAgainst: false, client }
}
