<script lang='ts'>
  import { Message } from '$lib/components/message'
  import Button from '$lib/components/ui/button/button.svelte'
  import { messages } from '$lib/modules/matrix/room'

  export let data

  $: room = data.room

  // $: pins = pinned(room)

  $: events = messages(room)

  function scrollback () {
    return data.client.matrix.scrollback(room, 20)
  }
</script>

<Button on:click={scrollback}>Load More</Button>
{#each $events as event (event.getId())}
  <Message {event} />
{/each}
