<script lang='ts'>
  import { onDestroy } from 'svelte'

  export let src: string
  export let title: string

  export let className: string | undefined = undefined
  export { className as class }

  onDestroy(() => URL.revokeObjectURL(src))
</script>

<iframe {src} {title} class={className} />
