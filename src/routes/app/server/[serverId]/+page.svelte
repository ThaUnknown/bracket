<script lang='ts'>
  import { spaceChildren } from '$lib/modules/matrix/room'

  export let data

  $: hierarchy = data.hierarchy
  $: done = $hierarchy.done

  $: rooms = data.client.rooms
  $: server = $rooms[data.server.roomId]!

  $: groupedrooms = data.client.groupedrooms
  $: ({ serverToSpace } = $groupedrooms)

  $: spaces = [...serverToSpace.get(server.roomId)!].map(s => s.roomId)

  $: rootRooms = spaceChildren(server).filter(r => !spaces.includes(r))
</script>

<div class='border-l-2 border-secondary ml-4'>
  {#each serverToSpace.get(server.roomId) as space (space.roomId)}
    <a href={'/#/app/room/' + space.roomId} class='p-4 rounded-lg block'>
      <h2 class='font-bold text-blue-600'>O - {space.name}</h2>
    </a>
    <div class='border-l-2 border-secondary ml-4'>
      {#each spaceChildren(space) as spaceId (spaceId)}
        {@const room = $rooms[spaceId] || $hierarchy.rooms.find(r => r.room_id === spaceId)}
        {#if room || !done}
          <a href={'/#/app/room/' + spaceId} class='p-4 rounded-lg block'>
            {#if room}
              <h2 class='font-bold text-blue-600'>#{room.name}</h2>
            {:else}
              <h2 class='font-bold text-blue-600'>Loading...</h2>
            {/if}
          </a>
        {/if}
      {/each}
    </div>
  {/each}
  {#each rootRooms as roomId (roomId)}
    {@const room = $rooms[roomId] || $hierarchy.rooms.find(r => r.room_id === roomId)}
    {#if room || !done}
      <a href={'/#/app/room/' + roomId} class='p-4 rounded-lg block'>
        {#if room}
          <h2 class='font-bold text-blue-600'>#{room.name}</h2>
        {:else}
          <h2 class='font-bold text-blue-600'>Loading...</h2>
        {/if}
      </a>
    {/if}
  {/each}
</div>
