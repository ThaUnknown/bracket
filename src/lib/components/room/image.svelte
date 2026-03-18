<script lang='ts'>
  import { EventType, type Room } from 'matrix-js-sdk'

  import type { TypedMatrixEvent } from '$lib/modules/matrix/event'

  import { Image } from '$lib/components/image'
  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'
  import { state } from '$lib/modules/matrix/room'
  import { cn } from '$lib/utils'

  export let room: Room

  $: statestore = state(room)

  $: avatar = ($statestore.getStateEvents(EventType.RoomAvatar) as Array<TypedMatrixEvent<'m.room.avatar'>>)[0]?.getContent().url || room.getAvatarFallbackMember()?.getMxcAvatarUrl()
  $: name = room.name

  let className: string | undefined = undefined
  export { className as class }
</script>

<Image src={mxcToHttp(avatar)} alt={name} class={cn('size-full object-contain min-h-0', className)} />
