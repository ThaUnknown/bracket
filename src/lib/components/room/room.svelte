<script lang='ts'>
  import { LocationAssetType, type MatrixEvent, type IContent, type User as MatrixUser, type ReceiptCache, Direction, type TimelineWindow, type Room } from 'matrix-js-sdk'
  import { makeHtmlMessage, makeTextMessage, makeLocationContent } from 'matrix-js-sdk/lib/content-helpers'

  import type { EditorContent } from '$lib/components/markdown/editor.svelte'
  import type { ClientInstance } from '$lib/modules/matrix/client'
  import type { TypedMatrixEvent } from '$lib/modules/matrix/event'
  import type { RoomMessageEventContent } from 'matrix-js-sdk/lib/types'

  import { Editor } from '$lib/components/markdown'
  import { Message } from '$lib/components/message'
  import { MemberList } from '$lib/components/room'
  import Button from '$lib/components/ui/button/button.svelte'
  import { User } from '$lib/components/user'
  import { activityState, idleState, lockedState, visibilityState } from '$lib/modules/idle'
  import { createMediaMetadata } from '$lib/modules/matrix/attachment/metadata'
  import { events, isSpace, messages, reactions, reads, state, typing } from '$lib/modules/matrix/room'
  import { debounce, throttle } from '$lib/utils'

  export let room: Room
  export let window: TimelineWindow
  export let client: ClientInstance

  $: if (!isSpace(room)) room.loadMembersIfNeeded()

  // $: pins = pinned(room)

  $: liveevents = events(room, window)

  $: msgs = messages(liveevents)

  $: receipts = reads(room)

  function concatreceipts (event: MatrixEvent, children: string[], receipts: ReceiptCache) {
    const c = children.map(c => receipts.get(c) ?? [])
    return (receipts.get(event.getId() || '') ?? []).concat(...c).filter(e => !!e)
  }

  $: users = client.users

  $: canJumpToLive = $liveevents && window.canPaginate(Direction.Forward)

  $: active = $activityState === 'active'
  $: idle = $idleState === 'idle'
  $: visible = $visibilityState === 'visible'
  $: locked = $lockedState === 'locked'

  $: canAutoReadMessage = active && !idle && visible && !locked

  $: myReceipt = $receipts && room.getEventReadUpTo(client.matrix.getSafeUserId())
  $: myReceiptIndex = $liveevents.findLastIndex(e => e.getId() === myReceipt)

  function readall () {
    const last = $msgs.at(-1)?.[0]
    if (!last) return
    read(last)
  }

  function read (event: MatrixEvent) {
    client.matrix.setRoomReadMarkers(room.roomId, event.getId()!, event)
  }

  let toReadIndex = -1
  let roReadEvent: MatrixEvent | undefined

  function checkRead (matrixevent: MatrixEvent) {
    const index = $liveevents.findIndex(e => e.getId() === matrixevent.getId())
    if (index <= myReceiptIndex) return

    // TODO: this should await that the event we sent has settled and isnt pending
    toReadIndex = index
    roReadEvent = matrixevent
  }

  const throttleRead = throttle(() => {
    read(roReadEvent!)
    toReadIndex = -1
    roReadEvent = undefined
  }, 500)

  $: canAutoReadMessage && toReadIndex !== -1 && throttleRead()

  let getContent: () => EditorContent
  let setValue: (val?: string) => void

  // TODO show error message sends

  function isValidUserMention (mention: string) {
    return $users.get(mention) ?? Object.values($users).find(user => user.displayName === mention || user.rawDisplayName === mention)
  }

  async function message () {
    const { markdown, isMarkdown, html, mentions } = getContent()
    if (!markdown) return // dont send empty messages
    const event: RoomMessageEventContent & IContent = isMarkdown ? makeHtmlMessage(markdown, html) : makeTextMessage(markdown)

    const valid = mentions.map(isValidUserMention).filter((e): e is MatrixUser => !!e && e.userId !== client.matrix.getUserId())
    if (valid.length) {
      event['m.mentions'] = {
        user_ids: valid.map(u => u.userId),
        room: false // TODO: you can mention rooms
      }
    }
    if (editEvent) {
      event['m.new_content'] = { ...event }
      event['m.relates_to'] = {
        rel_type: 'm.replace',
        event_id: editEvent.getId()!
      }
      editEvent = undefined
    } else if (replyEvent) {
      event['m.relates_to'] = {
        'm.in_reply_to': {
          event_id: replyEvent.getId()!
        }
      }
      replyEvent = undefined
    }
    setValue()
    await client.matrix.sendMessage(room.roomId, event)
  }

  async function location () {
    // TODO: live location
    const location = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject))
    const event = makeLocationContent(undefined, `geo:${location.coords.latitude},${location.coords.longitude}`, Date.now(), undefined, LocationAssetType.Pin) as RoomMessageEventContent

    await client.message(room.roomId, event)
  }

  async function file () {
    // TODO: this needs to be some sort of abortable modal
    const ctrl = new AbortController()
    const [fileHandle] = await showOpenFilePicker()
    const file = await fileHandle.getFile()
    const content = await createMediaMetadata(file, client.createFile(file, ctrl), ctrl)

    await client.message(room.roomId, content)
  }

  let value = ''
  let editEvent: TypedMatrixEvent<'m.room.message' | 'm.sticker'> | undefined
  let replyEvent: TypedMatrixEvent<'m.room.message' | 'm.sticker'> | undefined

  function edit (event: TypedMatrixEvent<'m.room.message' | 'm.sticker'>) {
    editEvent = event
    replyEvent = undefined
    setValue(event.getContent().body)
  }

  function reply (event: TypedMatrixEvent<'m.room.message' | 'm.sticker'>) {
    replyEvent = event
    editEvent = undefined
  }

  const debouncedTyping = debounce((_: unknown) => client.matrix.sendTyping(room.roomId, !!value, 2000), 1500)

  $: value && debouncedTyping(value)

  $: typingRooms = typing(client.matrix)
  $: typingRoom = $typingRooms.get(room.roomId)

  async function present () {
    await window.load(undefined, 30)
    liveevents = events(room, window)
  }

  function scrollback () {
    return window.paginate(Direction.Backward, 30)
  }

  $: statestore = state(room)
  $: members = Object.entries($statestore.members)
</script>

<div class='size-full flex flex-col'>
  <div class='h-full overflow-y-auto flex flex-col'>
    {#each $msgs as [event, children] (event.getId())}
      <Message {event} users={$users} reactions={reactions(liveevents, event.getId(), room.getUnfilteredTimelineSet())} receipts={concatreceipts(event, children, $receipts)} {client} {room} {checkRead} />
      <div>
        <Button on:click={() => edit(event)}>Edit</Button>
        <Button on:click={() => reply(event)}>Reply</Button>
      </div>
    {/each}
  </div>
  <div class='flex flex-wrap w-full'>
    Typing:
    {#each typingRoom as [userId] (userId)}
      {@const user = $users.get(userId)}
      {#if user}
        <User {user} />
      {:else}
        <span class='text-red-500'>{userId}</span>
      {/if}
    {/each}
  </div>
  <div>
    {#if editEvent}
      Editing
    {:else if replyEvent}
      Replying
    {/if}
  </div>
  <Editor class='h-52' bind:getContent bind:setValue bind:value />
  <div class='flex'>
    <Button on:click={scrollback}>Load More</Button>
    <Button on:click={message}>Send</Button>
    <Button on:click={readall}>Mark as Read</Button>
    <Button on:click={present} disabled={!canJumpToLive}>Jump to Present</Button>
    <Button variant='outline' on:click={file}>Attach</Button>
    <Button variant='outline' on:click={location}>Location</Button>
  </div>
</div>
<div class='flex flex-col shrink-0 w-50 p-2 border-l border-black/10 dark:border-white/10'>
  <div class='text-muted-foreground text-[10.5px] my-2 px-1.25'>{members.length} Member{members.length !== 1 ? 's' : ''}</div>
  <MemberList items={members} users={$users} />
</div>
