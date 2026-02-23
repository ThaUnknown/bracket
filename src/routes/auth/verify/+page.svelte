<script lang='ts'>
  import { CryptoEvent, decodeRecoveryKey } from 'matrix-js-sdk/lib/crypto-api'

  import Verification from './Verification.svelte'

  import { goto } from '$app/navigation'
  import { Button } from '$lib/components/ui/button'
  import { secretStorageKeys } from '$lib/modules/matrix/secrets'
  import { session } from '$lib/state'

  export let data

  const matrix = data.client!.matrix

  const crypto = matrix.getCrypto()!

  let verification = crypto.getVerificationRequestsToDeviceInProgress(matrix.getUserId() as string)[0]

  matrix.on(CryptoEvent.VerificationRequestReceived, request => {
    verification = request
  })

  // client.on(CryptoEvent.UserTrustStatusChanged, async userID => {
    // if (userID === client.getUserId()) goto('#/')
  // })

  let recoveryKey = ''

  async function passPhraseVerification () {
    try {
      const defaultKeyId = (await matrix.secretStorage.getDefaultKeyId())!
      const keyBackupKey = decodeRecoveryKey(recoveryKey)
      secretStorageKeys.set(defaultKeyId, keyBackupKey)

      const backupInfo = await crypto.getKeyBackupInfo()

      // this doesnt work, and *might* be the correct way of doing it? idk.
      // await crypto.storeSessionBackupPrivateKey(
      //   decodeRecoveryKey(recoveryKey),
      //   backupInfo.version
      // )

      // const recoverInfo = await crypto.restoreKeyBackup({
      //   progressCallback: console.log
      // })

      if (!(await matrix.secretStorage.hasKey())) {
        throw new Error('Secret storage has not been created yet.')
      } else {
        await crypto.bootstrapSecretStorage({ setupNewKeyBackup: !backupInfo })
        await crypto.bootstrapCrossSigning({ authUploadDeviceSigningKeys: req => req($session) })
      }

      if (await crypto.isDehydrationSupported()) await crypto.startDehydration()

      if (backupInfo) {
        await crypto.loadSessionBackupPrivateKeyFromSecretStorage()
        await crypto.restoreKeyBackup()
      }

      if (!(await crypto.getCrossSigningKeyId())) {
        throw new Error('Cross signing keys were not properly set up.')
      }

      await goto('/#/')
    // done!
    } catch (e) {
      console.error(e)
    // idk
    }
  }

  async function deviceVerification () {
    verification = await crypto.requestOwnUserVerification()
  }
</script>

{#if data.hasDevicesToVerifyAgainst}
  <Button on:click={deviceVerification}>Verify using another device</Button>
{/if}
{#if data.keyInfo}
  <input type='text' bind:value={recoveryKey} placeholder='Recovery key' />
  <Button on:click={passPhraseVerification}>Verify using recovery key</Button>
{/if}

{#if verification}
  <Verification {verification} />
{/if}
