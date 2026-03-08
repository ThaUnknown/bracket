<script lang='ts'>
  import FilePreview from './filepreview.svelte'
  import Opengraph from './opengraph.svelte'

  import type { ClientInstance } from '$lib/modules/matrix/client'
  import type { RoomMessageTextEventContent } from 'matrix-js-sdk/lib/types'

  import { Markdown } from '$lib/components/markdown'

  export let content: RoomMessageTextEventContent
  export let client: ClientInstance

  $: isMarkdown = content.format === 'org.matrix.custom.html'

  $: body = content.body.trim()

  $: url = body.match(/https?:\/\/[^\s<>"'`]+/i)?.[0]
  $: pathname = url && new URL(url).pathname
  $: isFile = pathname?.includes('.', pathname.lastIndexOf('/'))

  $: pureURL = url === body
</script>

{#if !pureURL}
  {#if isMarkdown}
    <div class='h-full overflow-auto'>
      <Markdown markdown={body} />
    </div>
  {:else}
    {body}
  {/if}
{/if}
{#if url}
  {#if isFile}
    <FilePreview src={url} external={true} renderfallback={pureURL} />
  {:else}
    {#await client.matrix.getUrlPreview(url, 0) then data}
      <Opengraph {data} />
    {/await}
  {/if}
{/if}
