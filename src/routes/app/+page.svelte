<script lang='ts'>
  export let data

  $: roomtypes = data.client.roomtypes

  $: groupedrooms = data.client.groupedrooms

  $: ({ dms, servers } = $roomtypes)

  $: ({ serverToSpace, spaceToRoom, serverToRoom } = $groupedrooms)

// $: trees = servers.values().map(r => client.matrix.getRoomHierarchy(r.roomId).then(e=>console.log(r.roomId, e))).toArray()
</script>

<div class='w-full grid grid-cols-2'>
  <div>
    <div>DMs</div>
    {#each dms.entries() as [id, room] (id)}
      <a href={'/#/app/room/' + id} class='p-4 rounded-lg mb-2 block'>
        <h2 class='font-bold text-blue-600'>&gt; {room.name}</h2>
      </a>
    {/each}
  </div>
  <div>
    Servers
    {#each servers.entries() as [serverId, room] (serverId)}
      <a href={'/#/app/room/' + serverId} class='p-4 rounded-lg block'>
        <h2 class='font-bold text-blue-600'>{room.name}</h2>
      </a>
      <div class='border-l-2 border-secondary ml-4'>
        {#each serverToSpace.get(serverId) as space (space.roomId)}
          <a href={'/#/app/room/' + space.roomId} class='p-4 rounded-lg block'>
            <h2 class='font-bold text-blue-600'>O - {space.name}</h2>
          </a>
          <div class='border-l-2 border-secondary ml-4'>
            {#each spaceToRoom.get(space.roomId) as room (room.roomId)}
              <a href={'/#/app/room/' + room.roomId} class='p-4 rounded-lg block'>
                <h2 class='font-bold text-blue-600'>#{room.name}</h2>
              </a>
            {/each}
          </div>
        {/each}
        {#each serverToRoom.get(serverId) as room (room.roomId)}
          <a href={'/#/app/room/' + room.roomId} class='p-4 rounded-lg block'>
            <h2 class='font-bold text-blue-600'>#{room.name}</h2>
          </a>
        {/each}
      </div>
    {/each}
  </div>
</div>
