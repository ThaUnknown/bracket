<script lang='ts'>
  import type { RoomMessageTextEventContent } from 'matrix-js-sdk/lib/types'

  import { Markdown } from '$lib/components/markdown'

  export let content: RoomMessageTextEventContent

  $: isMarkdown = content.format === 'org.matrix.custom.html'

  $: body = content.body
</script>

{#if isMarkdown}
  <Markdown markdown={body} />
{:else}
  {body}
{/if}
