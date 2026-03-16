<script lang='ts'>
  import type { HTMLImgAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils'

  type $$Props = HTMLImgAttributes & { color?: string | null | undefined }

  export let src: $$Props['src'] = ''
  export let alt: $$Props['alt'] = ''
  let className: $$Props['class'] = ''
  export { className as class }

  let ready = false

  async function test (e: Event & { currentTarget: EventTarget & Element }) {
    const target = e.currentTarget as HTMLImageElement
    await target.decode()
    ready = true
  }

  let error = false
</script>

<div class={cn('overflow-clip', className)}>
  {#if !src || error}
    <div class={cn('flex justify-center items-center', className)}>{alt?.slice(0, 2)}</div>
  {:else}
    <img {src} {alt} on:load on:load={test} on:error={() => { error = true }} class={cn(className, 'duration-300', 'transition-[opacity,filter] load-in', !ready && 'opacity-0 blur-none')} decoding='async' loading='lazy' />
  {/if}
</div>

<style>
  @keyframes load-in {
    from {
      opacity: 0;
      filter: blur(6px);
    }
    to {
      filter: blur(0);
    }
  }
/*
  @keyframes load-in-no-blur {
    from {
      opacity: 0;
    }
  } */

  .load-in {
    animation: load-in 0.3s ease-out 0s 1;
  }

  /* .load-in-no-blur {
    animation: load-in-no-blur 0.3s ease-out 0s 1;
  } */
</style>
