<script lang='ts'>
  import { RoomImage } from '$lib/components/room'
  import { Button } from '$lib/components/ui/button'
  import { setClient } from '$lib/state'

  export let data

  $: roomtypes = data.client.roomtypes

  setClient(data.client)

  $: ({ servers } = $roomtypes)
</script>

<div class='size-full flex'>
  <div class='h-full w-13.5 border-r border-black/10 dark:border-white/10 flex flex-col items-center pt-2 gap-1.5 shrink-0'>
    <Button class='size-8 rounded-full [corner-shape:squircle] p-0' href='/#/app/'>[</Button>
    <div class='w-2/5 border-b border-black/10 dark:border-white/10' />
    {#each servers.entries() as [id, room] (id)}
      <Button class='size-8 rounded-full [corner-shape:squircle] p-0 overflow-clip' href='/#/app/server/{id}' variant='outline'>
        <RoomImage {room} />
      </Button>
    {/each}
  </div>
  <div class='size-full'>
    <slot />
  </div>
</div>
