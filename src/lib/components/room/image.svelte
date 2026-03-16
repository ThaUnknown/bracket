<script lang='ts'>
  import { EventType, type Room } from 'matrix-js-sdk'

  import type { TypedMatrixEvent } from '$lib/modules/matrix/event'

  import { Image } from '$lib/components/image'
  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'
  import { state } from '$lib/modules/matrix/room'

  export let room: Room

  $: statestore = state(room)

  $: avatar = ($statestore.getStateEvents(EventType.RoomAvatar) as Array<TypedMatrixEvent<'m.room.avatar'>>)[0]?.getContent().url
  $: name = room.name
</script>

<Image src={mxcToHttp(avatar)} alt={name} class='size-full object-contain min-h-0' />
