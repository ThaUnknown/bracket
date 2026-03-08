<script lang='ts'>
  import mime from 'mime/lite'

  import { Button } from '$lib/components/ui/button'

  export let src: string
  let pathname = new URL(src).pathname
  $: pathname = new URL(src).pathname
  export let name = pathname.substring(pathname.lastIndexOf('/') + 1) || pathname
  export let size = 0
  export let external = false
  export let renderfallback = true

  $: type = mime.getType(name) || 'application/octet-stream'

  $: document = ['application/pdf', 'text/html'].includes(type) && !external
  $: image = type.startsWith('image/')
  $: video = type.startsWith('video/')
  $: audio = type.startsWith('audio/')
  $: embeddable = document || image || video || audio

  async function getBlobURL () {
    const response = await fetch(src)
    if (!response.ok) throw new Error('Failed to fetch file')
    return URL.createObjectURL(await response.blob())
  }

  let allowed = false
  function allowExternal () {
    allowed = true
  }
</script>

{#if !embeddable}
  {#if renderfallback}
    <a href={src} download={name} class='text-primary hover:text-primary-hover hover:underline focus:outline-hidden focus:underline'>{name}</a>
  {/if}
{:else}
  {#if external && !allowed}
    <Button on:click={allowExternal}>Allow External Content</Button>
  {:else}
    {#if document}
      {#await getBlobURL() then globURL}
        <iframe src={globURL} title={name} class='h-full object-contain min-h-0' loading='lazy' />
      {:catch error}
        <a href={src} download={name} class='text-primary hover:text-primary-hover hover:underline focus:outline-hidden focus:underline'>{name}</a>
      {/await}
    {:else if image}
      <img {src} alt={name} class='h-full object-contain min-h-0' decoding='async' loading='lazy' />
    {:else if video}
      <video controls class='h-full min-h-0 object-contain bg-transparent' preload='metadata'>
        <source {src} {type} />
        Your browser does not support the video tag.
      </video>
    {:else if audio}
      <audio controls preload='metadata'>
        <source {src} {type} />
        Your browser does not support the audio element.
      </audio>
    {/if}
  {/if}
{/if}
