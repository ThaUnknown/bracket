<script lang='ts'>
  import { setContext } from 'svelte'
  import { writable } from 'svelte/store'

  import type { PopoverContext } from './types.ts'

  export let open = false

  const _open = writable(false)

  $: open = $_open

  setContext<PopoverContext>('popover', {
    open: _open,
    id: crypto.randomUUID()
  })
</script>

<slot />
