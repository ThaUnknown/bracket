<script lang='ts'>
  import { setContext } from 'svelte'
  import { writable } from 'svelte/store'

  import type { PopoverContext } from './types.ts'

  const open = writable(false)
  const id = crypto.randomUUID()

  const context: PopoverContext = {
    open,
    id,
    toggle: () => open.update((v) => !v),
    close: () => open.set(false)
  }

  setContext<PopoverContext>('popover', context)
</script>

<slot />
