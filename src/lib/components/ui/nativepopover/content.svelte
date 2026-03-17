<script lang='ts'>
  import { getContext } from 'svelte'

  import type { PopoverContext } from './types.ts'

  type Side = 'top' | 'bottom' | 'left' | 'right'

  export let side: Side = 'bottom'
  export let sideOffset = 6
  export let popover: 'auto' | 'manual' | 'hint' = 'auto'

  const { open, id } = getContext<PopoverContext>('popover')

  function toggle ({ newState }: ToggleEvent) {
    open.set(newState === 'open')
  }
</script>

<div
  {id}
  {popover}
  role='dialog'
  style:--side-offset='{sideOffset}px'
  style:--side='{side} span-all'
  on:toggle={toggle}
  {...$$restProps}>
  {#if $open}
    <slot />
  {/if}
</div>

<style>
  div {
    /* reset default styles */
    width: auto;
    border: none;
    background: transparent;
    overflow: visible;

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
