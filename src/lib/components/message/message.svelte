<script lang='ts'>
  import { MsgType, type CachedReceipt, type User as MatrixUser } from 'matrix-js-sdk'

  import Audio from './audio.svelte'
  import File from './file.svelte'
  import Image from './image.svelte'
  import Location from './location.svelte'
  import Sticker from './sticker.svelte'
  import Text from './text.svelte'
  import Video from './video.svelte'

  import type { TypedMatrixEvent } from '$lib/modules/matrix/event'

  import { User } from '$lib/components/user'

  export let event: TypedMatrixEvent<'m.room.message' | 'm.sticker'>
  export let users: Record<string, MatrixUser>
  export let receipts: CachedReceipt[] = []

  function isMessage (event: TypedMatrixEvent<'m.room.message' | 'm.sticker'>): event is TypedMatrixEvent<'m.room.message'> {
    return event.getType() === 'm.room.message'
  }

  $: user = users[event.getSender() || '']
</script>

<div class='p-1 max-h-60 ring ring-inset ring-black/10 dark:ring-white/15 flex flex-col'>
  {#if user}
    <User {user} />:
  {/if}
  {#if isMessage(event)}
    {@const content = event.getContent()}
    {@const type = content.msgtype}
    {#if type === MsgType.Text}
      <Text {content} />
    {:else if type === MsgType.Emote}
      <Text {content} />
    {:else if type === MsgType.Image}
      <Image {content} />
    {:else if type === MsgType.Video}
      <Video {content} />
    {:else if type === MsgType.Audio}
      <Audio {content} />
    {:else if type === MsgType.File}
      <File {content} />
    {:else if type === MsgType.Location}
      <Location {content} />
    {:else if type === MsgType.Notice}
      <Text {content} />
    {:else if type === MsgType.KeyVerificationRequest}
      KeyVerificationRequest?
    {:else}
      Unknown message! {type}
    {/if}
  {:else}
    <Sticker content={event.getContent()} />
  {/if}
  <div class='flex gap-1'>
    {receipts.length} Receipts:
    {#each receipts as receipt (receipt.userId)}
      {@const user = users[receipt.userId]}
      {#if user}
        <User {user} />: {receipt.type}
      {:else}
        <span class='text-red-500'>{receipt.userId}: {receipt.type}</span>
      {/if}
    {/each}
  </div>
</div>
