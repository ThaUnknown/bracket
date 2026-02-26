<script lang='ts'>
  import { MsgType } from 'matrix-js-sdk'

  import Audio from './audio.svelte'
  import File from './file.svelte'
  import Image from './image.svelte'
  import Location from './location.svelte'
  import Sticker from './sticker.svelte'
  import Text from './text.svelte'
  import Video from './video.svelte'

  import type { TypedMatrixEvent } from '$lib/modules/matrix/event'

  export let event: TypedMatrixEvent<'m.room.message' | 'm.sticker'>

  function isMessage (event: TypedMatrixEvent<'m.room.message' | 'm.sticker'>): event is TypedMatrixEvent<'m.room.message'> {
    return event.getType() === 'm.room.message'
  }
</script>

<div class='p-1 max-h-40 ring ring-inset ring-black/10 dark:ring-white/15'>
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
      Unknown message!
    {/if}
  {:else}
    <Sticker content={event.getContent()} />
  {/if}
</div>
