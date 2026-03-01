<script lang='ts'>
  import { LocationAssetType, type IContent } from 'matrix-js-sdk'
  import { makeHtmlMessage, makeTextMessage, makeLocationContent } from 'matrix-js-sdk/lib/content-helpers'

  import type { EditorContent } from '$lib/components/markdown/editor.svelte'
  import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types'

  import { Editor } from '$lib/components/markdown'
  import { Message } from '$lib/components/message'
  import Button from '$lib/components/ui/button/button.svelte'
  import { User } from '$lib/components/user'
  import { createMediaMetadata } from '$lib/modules/matrix/attachment/metadata'
  import { messages, reads, typing } from '$lib/modules/matrix/room'

  export let data

  $: room = data.room

  // $: pins = pinned(room)

  $: msgs = messages(room)

  $: receipts = reads(room)
  $: users = data.client.users

  $: typingRooms = typing(data.client.matrix)

  $: typingRoom = $typingRooms.get(room.roomId)

  $: room.loadMembersIfNeeded()

  function scrollback () {
    return data.client.matrix.scrollback(room, 20)
  }

  let getContent: () => EditorContent

  // TODO show error message sends
  // TODO room.hasEncryptionStateEvent() needs to be checked and maybe awaited?

  function isValidUserMention (mention: string) {
    return $users[mention] || Object.values($users).find(user => user.displayName === mention || user.rawDisplayName === mention)
  }

  async function message () {
    const { markdown, isMarkdown, html, mentions } = getContent()
    if (!markdown) return // dont send empty messages
    const event: RoomMessageEventContent & IContent = isMarkdown ? makeHtmlMessage(markdown, html) : makeTextMessage(markdown)

    const valid = mentions.map(isValidUserMention).filter(e => !!e)
    if (valid.length) {
      event['m.mentions'] = {
        user_ids: valid.map(u => u.userId),
        room: false // TODO: you can mention rooms
      }
    }

    await data.client.matrix.sendMessage(room.roomId, event)
  }

  async function location () {
    // TODO: live location
    const location = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject))
    const event = makeLocationContent(undefined, `geo:${location.coords.latitude},${location.coords.longitude}`, Date.now(), undefined, LocationAssetType.Pin) as RoomMessageEventContent

    await data.client.matrix.sendMessage(room.roomId, event)
  }

  async function file () {
    // TODO: this needs to be some sort of abortable modal
    const ctrl = new AbortController()
    const [fileHandle] = await showOpenFilePicker()
    const file = await fileHandle.getFile()
    const content = await createMediaMetadata(file, data.client.createFile(file, ctrl), ctrl)

    await data.client.matrix.sendMessage(room.roomId, content)
  }
</script>

<div class='h-full flex flex-col'>
  <div class='h-full overflow-y-auto flex flex-col'>
    <Button on:click={scrollback}>Load More</Button>
    {#each $msgs as event (event.getId())}
      <Message {event} users={$users} receipts={$receipts.get(event.getId() || '') ?? []} />
    {/each}
  </div>
  <div>
    Typing:
    {#each typingRoom as [userId] (userId)}
      {@const user = $users[userId]}
      {#if user}
        <User {user} />
      {:else}
        <span class='text-red-500'>{userId}</span>
      {/if}
    {/each}
  </div>
  <Editor class='h-52' bind:getContent />
  <div class='flex'>
    <Button on:click={message}>Send</Button>
    <Button variant='outline' on:click={file}>Attach</Button>
    <Button variant='outline' on:click={location}>Location</Button>
  </div>
</div>
