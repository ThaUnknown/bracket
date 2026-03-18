<script lang='ts'>
  import { derived } from 'svelte/store'
  import { persisted } from 'svelte-persisted-store'

  import { page } from '$app/stores'
  import { RoomImage } from '$lib/components/room'
  import { Button } from '$lib/components/ui/button'
  import { lastactive } from '$lib/modules/matrix/room'
  import { cn } from '$lib/utils'

  export let data

  const lastDMstore = persisted<string | undefined>('lastDM', undefined)

  $: roomtypes = data.client.roomtypes

  $: ({ dms } = $roomtypes)

  $: sorted = derived(dms.values().toArray().map(r => lastactive(r)), rooms => {
    return rooms.toSorted((a, b) => b.ts - a.ts)
  })

  $: if ($page.route.id === '/app/dm/[roomId]') $lastDMstore = $page.params.roomId
</script>

<div class='flex size-full flex-nowrap'>
  <div class='h-full overflow-y-auto overflow-x-clip w-70 border-r border-black/10 dark:border-white/10 shrink-0 text-muted-foreground py-2'>
    <div class='text-muted-foreground text-[10.5px] my-2 px-3.25'>Direct Messages</div>
    <div class='gap-0.5 flex flex-col'>
      {#each $sorted as { room, unread } (room.roomId)}
        <div class='relative flex items-center px-2'>
          {#if unread > 0}
            <div class='w-0.75 bg-foreground absolute left-0 rounded-r-lg h-1.5' />
          {/if}
          <Button variant='ghost' class={cn('w-full rounded-[6px] px-1.5 py-1 h-auto justify-start gap-2.5', unread > 0 && 'text-foreground', $page.params.roomId === room.roomId && 'dark:bg-foreground/10 bg-foreground text-foreground')} href='/#/app/dm/{room.roomId}'>
            <RoomImage {room} class='size-6 rounded-full bg-muted' />
            <div class='text-nowrap text-ellipsis overflow-hidden font-medium text-xs'>
              {room.name}
            </div>
          </Button>
        </div>
      {/each}
    </div>
  </div>
  <slot />
</div>
