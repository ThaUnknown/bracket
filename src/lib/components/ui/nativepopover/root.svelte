<script lang='ts'>
  import { setContext } from 'svelte'
  import { writable } from 'svelte/store'

  import type { PopoverContext } from './types.ts'

  export let open = writable(false)

  setContext<PopoverContext>('popover', {
    open,
    id: crypto.randomUUID()
  })
</script>

<slot />
