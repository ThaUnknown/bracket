<script lang='ts'>
  import type { IPreviewUrlResponse } from 'matrix-js-sdk'

  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'

  export let data: IPreviewUrlResponse

  $: src = data['og:image'] && mxcToHttp(data['og:image'])

  $: author = data['og:site_name']
  $: title = data['og:title']
  // $: largeImage = data['og:type'] === 'object'
  $: url = data['og:url']
  $: desc = data['og:description']
</script>

{#if author}
  <div class='text-xs'>{author}</div>
{/if}
{#if title}
  {#if url}
    <a href={url} target='_blank' rel='noopener noreferrer' class='text-primary hover:text-primary-hover hover:underline focus:outline-hidden focus:underline'>{title}</a>
  {:else}
    <div class='font-bold text-lg'>{title}</div>
  {/if}
{/if}
{#if src}
  <img {src} alt={title || 'Link preview image'} decoding='async' loading='lazy' class='h-full object-contain min-h-0' />
{/if}
{#if desc}
  <div class='text-sm'>{desc}</div>
{/if}
