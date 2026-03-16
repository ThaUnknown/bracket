<script lang='ts'>
  import { getContext } from 'svelte'

  import type { PopoverContext } from './types.js'
  import type { ClassValue } from 'svelte/elements'

  import { cn } from '$lib/utils'

  type Side = 'top' | 'bottom' | 'left' | 'right'
  type Align = 'start' | 'center' | 'end'

  let className: ClassValue | undefined = undefined
  export { className as class }
  /**
     * Preferred side relative to the trigger.
     * The browser will try fallbacks in this order when there is not enough room:
     *   bottom → top → right → left  (and so on, depending on the initial side)
     * @default 'bottom'
     */
  export let side: Side = 'bottom'
  /**
     * Alignment along the cross-axis.
     * @default 'center'
     */
  export let align: Align = 'center'
  export let sideOffset = 6

  const { open, id, close } = getContext<PopoverContext>('popover')

  // Lazy: don't render until first open
  let hasBeenOpened = false

  $: if ($open && !hasBeenOpened) hasBeenOpened = true

  function handleToggle (e: ToggleEvent) {
    if (e.newState === 'closed' && $open) close()
    if (e.newState === 'open' && !$open) open.set(true)
  }
</script>

<div
  {id}
  popover='auto'
  role='dialog'
  class={cn('popover-content', className)}
  style:--side-offset='{sideOffset}px'
  style:--side='{side} span-all'
  on:toggle={handleToggle}
  {...$$restProps}>
  {#if hasBeenOpened}
    <slot />
  {/if}
</div>

<style>
  .popover-content {
    width: auto;
    inset: unset;
    border: none;
    padding: 0;
    background: transparent;
    overflow: visible;

    position: absolute;
    position-area: var(--side);

    margin: var(--side-offset);

    --dur: 150ms;
    --ease: cubic-bezier(0.16, 1, 0.3, 1);

    transition:
      display var(--dur) allow-discrete,
      overlay var(--dur) allow-discrete,
      opacity var(--dur) var(--ease),
      transform var(--dur) var(--ease);

    opacity: 0;

    &:popover-open {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    transform: scale(0.95) translateY(-4px);

    @starting-style {
      &:popover-open {
        opacity: 0;
        transform: scale(0.95) translateY(-4px);
      }
    }
  }
</style>
