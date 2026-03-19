<script lang='ts'>
  import { page } from '$app/stores'
  import { Button } from '$lib/components/ui/button'
  import { isSpace, spaceChildren } from '$lib/modules/matrix/room'
  import { cn } from '$lib/utils'

  export let data

  $: hierarchy = data.hierarchy
  $: done = $hierarchy.done

  $: rooms = data.client.rooms
  $: server = $rooms[data.server.roomId]!

  $: groupedrooms = data.client.groupedrooms
  $: ({ serverToSpace } = $groupedrooms)

  $: spaces = [...serverToSpace.get(server.roomId)!].map(s => s.roomId)

  $: rootRooms = spaceChildren(server).filter(r => !spaces.includes(r))

  $: space = isSpace(server)
</script>

<div class='flex size-full flex-nowrap'>
  {#if space}
    <div class='h-full overflow-y-auto overflow-x-clip w-70 border-r border-black/10 dark:border-white/10 shrink-0 text-muted-foreground'>
      <div class='px-2 py-3 font-bold text-[16px] border-b border-black/10 dark:border-white/10 leading-none text-foreground'>
        {server.name}
      </div>
      {#each serverToSpace.get(server.roomId) as space (space.roomId)}
        <details class='px-2' open={true}>
          <summary class='text-[10px] text-nowrap text-ellipsis overflow-clip h-4.5 mt-4 cursor-pointer hover:text-foreground'>
            {space.name}
          </summary>
          {#each spaceChildren(space) as spaceId (spaceId)}
            {@const room = $rooms[spaceId] || $hierarchy.rooms.find(r => r.room_id === spaceId)}
            {@const joined = $rooms[spaceId]}
            {@const active = $page.params.roomId === spaceId}
            {#if room || !done}
              {#if room}
                <Button variant='ghost' size='sm' class={cn('px-1.5 w-full justify-start text-ellipsis overflow-clip text-nowrap text-xs h-6 gap-1.5 rounded-[6px]', active && 'bg-foreground text-foreground dark:bg-foreground/10')} href='/#/app/server/{server.roomId}/{spaceId}'>
                  {#if joined}
                    <div>#</div>
                  {:else}
                    <div>X</div>
                  {/if}
                  {room.name}
                </Button>
              {:else}
                <Button variant='ghost' size='sm' class='w-full h-6 p-1.5 hover:bg-transparent!'>
                  <div class='size-full bg-muted/50 animate-pulse rounded-[6px]' />
                </Button>
              {/if}
            {/if}
          {/each}
        </details>
      {/each}
      <details class='px-2' open={true}>
        <summary class='text-[10px] text-nowrap text-ellipsis overflow-clip h-4.5 mt-4 cursor-pointer hover:text-foreground'>
          Channels
        </summary>
        {#each rootRooms as roomId (roomId)}
          {@const room = $rooms[roomId] || $hierarchy.rooms.find(r => r.room_id === roomId)}
          {@const joined = $rooms[roomId]}
          {@const active = $page.params.roomId === roomId}
          {#if room || !done}
            {#if room}
              <Button variant='ghost' size='sm' class={cn('px-1.5 w-full justify-start text-ellipsis overflow-clip text-nowrap text-xs h-6 gap-1.5 rounded-[6px]', active && 'bg-foreground text-foreground dark:bg-foreground/10')} href='/#/app/server/{server.roomId}/{roomId}'>
                {#if joined}
                  <div>#</div>
                {:else}
                  <div>X</div>
                {/if}
                {room.name}
              </Button>
            {:else}
              <Button variant='ghost' size='sm' class='w-full h-6 p-1.5 hover:bg-transparent!'>
                <div class='size-full bg-muted/50 animate-pulse rounded-[6px]' />
              </Button>
            {/if}
          {/if}
        {/each}
      </details>
    </div>
  {/if}
  <slot />
</div>
