<script lang='ts'>
  import { messages } from '$lib/modules/matrix/room'

  export let data

  $: room = data.room

  $: msgs = messages(room)
</script>

{#each $msgs as message (message.getId())}
  <div>{message.getType()}-{JSON.stringify(message.getContent())}</div>
{/each}
