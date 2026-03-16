<script lang='ts'>
  import SvelteVirtualList from '@humanspeak/svelte-virtual-list'

  import { RoomMember } from './index.ts'

  import type { RoomMember as MatrixRoomMember, User } from 'matrix-js-sdk'

  export let items: [string, MatrixRoomMember][]
  export let users: Map<string, User>
</script>

<SvelteVirtualList {items} itemsClass='gap-2 flex flex-col'>
  {#snippet renderItem([id, member])}
    <RoomMember {member} user={users.get(id)} />
  {/snippet}
</SvelteVirtualList>
