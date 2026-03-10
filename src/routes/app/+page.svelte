<script lang='ts'>
  export let data

  $: roomtypes = data.client.roomtypes

  $: ({ dms, servers } = $roomtypes)
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
    {#each servers.entries() as [id, server] (id)}
      <a href={'/#/app/server/' + id} class='p-4 rounded-lg block'>
        <h2 class='font-bold text-blue-600'>{server.name}</h2>
      </a>
    {/each}
  </div>
</div>
