<script lang='ts'>
  import { Separator as SeparatorPrimitive } from 'bits-ui'

  import { cn } from '$lib/utils.js'

  export let ref: SeparatorPrimitive.RootProps['ref'] = null
  export let className: SeparatorPrimitive.RootProps['class'] = undefined
  export { className as class }
  export let dataSlot: SeparatorPrimitive.RootProps['data-slot'] = 'separator'
</script>

<SeparatorPrimitive.Root
  bind:ref
  data-slot={dataSlot}
  class={cn(
    'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:min-h-full data-[orientation=vertical]:w-px',
    className
  )}
  {...$$restProps}
/>
