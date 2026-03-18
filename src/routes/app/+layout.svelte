<script lang='ts'>
  import { derived } from 'svelte/store'

  import { page } from '$app/stores'
  import { RoomImage } from '$lib/components/room'
  import { SidebarButton } from '$lib/components/sidebar'
  import { lastactive } from '$lib/modules/matrix/room'
  import { setClient } from '$lib/state'

  export let data

  $: roomtypes = data.client.roomtypes

  setClient(data.client)

  $: ({ servers, dms } = $roomtypes)

  $: sorted = derived(dms.values().toArray().map(r => lastactive(r)), rooms => {
    return rooms.filter(({ unread }) => unread > 0).toSorted((a, b) => b.ts - a.ts)
  })
</script>

<div class='size-full flex'>
  <div class='h-full w-13.5 border-r border-black/10 dark:border-white/10 flex flex-col items-center pt-2 gap-1.5 shrink-0'>
    <SidebarButton href='/#/app/dm/' active={!$page.params.serverId}>[</SidebarButton>
    {#each $sorted as { room, unread } (room.roomId)}
      <SidebarButton href='/#/app/dm/{room.roomId}' class='[corner-shape:unset] overflow-visible relative' active={$page.params.roomId === room.roomId}>
        <RoomImage {room} class='rounded-full overflow-clip' />
        <div class='absolute bg-red-500 leading-none size-3 text-[8px] rounded-full bottom-0 right-0 flex justify-center pl-[0.5px] items-center font-black font-[roboto] ring-2 ring-background'>{unread}</div>
      </SidebarButton>
    {/each}
    <div class='w-2/5 border-b border-black/10 dark:border-white/10' />
    {#each servers.entries() as [id, room] (id)}
      <SidebarButton href='/#/app/server/{id}' active={$page.params.serverId === id}>
        <RoomImage {room} />
      </SidebarButton>
    {/each}
  </div>
  <div class='size-full flex'>
    <slot />
  </div>
</div>
