<script lang='ts'>
  import { Button } from '$lib/components/ui/button'
  import { cn } from '$lib/utils'

  export let active = false
  export let href: string

  let className: string | undefined = undefined
  export { className as class }
</script>

<div class='w-full flex flex-col items-center justify-center group'>
  <div class={cn('w-0.75 bg-foreground absolute left-0 rounded-r-lg group-hover:h-3.75 transition-[height] h-0', active && 'h-7.5!')} />
  <Button class={cn('size-8 rounded-full [corner-shape:squircle] p-0 overflow-clip', className)} {href} variant={active ? 'default' : 'outline'} on:click>
    <slot />
  </Button>
</div>
