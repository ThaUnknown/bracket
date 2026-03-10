<script lang='ts'>
  import { VerificationPhase, VerificationRequestEvent, VerifierEvent, type ShowQrCodeCallbacks, type ShowSasCallbacks, type VerificationRequest } from 'matrix-js-sdk/lib/crypto-api'
  import { VerificationMethod } from 'matrix-js-sdk/lib/types'
  import { onDestroy } from 'svelte'

  import { Button } from '$lib/components/ui/button'
  import { scan } from '$lib/modules/qr'

  // TODO: this needs to support incoming and outgoing requests

  export let verification: VerificationRequest

  $: chosenMethod = verification.chosenMethod
  $: phase = verification.phase

  // $: showSAS = verification.otherPartySupportsMethod(VerificationMethod.Sas)
  // $: showQR = verification.otherPartySupportsMethod(VerificationMethod.Reciprocate)

  $: verification.on(VerificationRequestEvent.Change, () => {
    phase = verification.phase
    chosenMethod = verification.chosenMethod
  })

  let sas: ShowSasCallbacks
  let qr: ShowQrCodeCallbacks

  $: if (phase === VerificationPhase.Started) {
    const verifier = verification.verifier
    if (verifier) {
      verifier.verify()
      verifier.on(VerifierEvent.ShowSas, callbacks => {
        sas = callbacks
      })
      verifier.on(VerifierEvent.ShowReciprocateQr, callbacks => {
        qr = callbacks
      })
    }
  }

  onDestroy(() => {
    const verifier = verification.verifier
    if (verifier) {
      verifier.removeAllListeners(VerifierEvent.ShowSas)
      verifier.removeAllListeners(VerifierEvent.ShowReciprocateQr)
    }

    verification.removeAllListeners(VerificationRequestEvent.Change)
  })
</script>

{#if phase === VerificationPhase.Requested}
  <!-- TODO: only on incoming/outgoing? WIP. -->
  <Button on:click={() => verification.accept()}>Accept</Button>
  <Button on:click={() => verification.cancel()}>Cancel</Button>
{:else if phase === VerificationPhase.Ready}
  Ready
  {#if 'BarcodeDetector' in globalThis}
    <Button on:click={() => scan(e => verification.scanQRCode(e))}>Scan QR Code</Button>
  {/if}
{:else if phase === VerificationPhase.Started}
  Started
  {#if chosenMethod === VerificationMethod.Reciprocate}
    {#if qr}
      <Button on:click={() => qr.confirm()}>Match</Button>
      <Button on:click={() => qr.cancel()}>Don't Match</Button>
    {/if}
  {:else if chosenMethod === VerificationMethod.Sas}
    {#if sas}
      SAS: {sas.sas.emoji?.map(([e]) => e).join(' ')}
      <Button on:click={() => sas.confirm()}>Match</Button>
      <Button on:click={() => sas.cancel()}>Don't Match</Button>
    {/if}
  {:else}
    hm???
  {/if}
{:else if phase === VerificationPhase.Cancelled}
  Cancelled
{:else if phase === VerificationPhase.Done}
  Done
{/if}
