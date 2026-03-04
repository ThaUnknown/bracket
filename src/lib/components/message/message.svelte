<script lang='ts'>
  import { MsgType, type CachedReceipt, type User as MatrixUser } from 'matrix-js-sdk'

  import Audio from './audio.svelte'
  import File from './file.svelte'
  import Image from './image.svelte'
  import Location from './location.svelte'
  import Sticker from './sticker.svelte'
  import Text from './text.svelte'
  import Video from './video.svelte'

  import type { ClientInstance } from '$lib/modules/matrix/client'
  import type { TypedMatrixEvent } from '$lib/modules/matrix/event'
  import type { Readable } from 'svelte/store'

  import { Button } from '$lib/components/ui/button'
  import { User } from '$lib/components/user'

  export let event: TypedMatrixEvent<'m.room.message' | 'm.sticker'>
  export let users: Record<string, MatrixUser>
  export let receipts: CachedReceipt[] = []
  export let children: string[] = []
  export let reactions: Readable<Array<TypedMatrixEvent<'m.reaction'>>>
  export let client: ClientInstance

  function isMessage (event: TypedMatrixEvent<'m.room.message' | 'm.sticker'>): event is TypedMatrixEvent<'m.room.message'> {
    return event.getType() === 'm.room.message'
  }

  function joy () {
    return client.react(event.getRoomId()!, event.getId()!, '😊')
  }

  function del () {
    return client.delete(event.getRoomId()!, event.getId()!)
  }

  $: user = users[event.getSender() || '']

  // @ts-expect-error private field
  $: isEdited = !!event._replacingEvent

  $: groupedReactions = Map.groupBy($reactions, r => r.getContent()['m.relates_to'].key)
</script>

<div class='p-1 max-h-60 ring ring-inset ring-black/10 dark:ring-white/15 flex flex-col'>
  {#if user}
    <User {user} />: {isEdited ? '(edited)' : ''}
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
  <div>
    {groupedReactions.size} Reactions:
    {#each groupedReactions.entries() as [emoji, events] (emoji)}
      {#each events as event (event.getId())}
        {emoji}:
        {@const user = users[event.getSender() || '']}
        {#if user}
          <User {user} />
        {:else}
          <span class='text-red-500'>{event.getSender()}</span>
        {/if}
      {/each}
    {/each}
  </div>
  <div>
    <Button on:click={joy}>Joy</Button>
    <Button on:click={del}>Delete</Button>
  </div>
</div>
