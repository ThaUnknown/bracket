<script lang='ts'>
  import { getContext } from 'svelte'

  import type { PopoverContext } from './types.ts'

  const { id } = getContext<PopoverContext>('popover')
</script>

<button
  type='button'
  popovertarget={id}
  popovertargetaction='toggle'
  {...$$restProps}>
  <slot />
</button>
