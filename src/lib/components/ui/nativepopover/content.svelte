<script lang='ts'>
  import { getContext } from 'svelte'

  import type { PopoverContext } from './types.ts'

  export let side: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
  export let sideOffset = 6
  export let popover: 'auto' | 'manual' | 'hint' = 'auto'
  export let span: 'top' | 'bottom' | 'left' | 'right' | 'all' = 'all'

  const { open, id } = getContext<PopoverContext>('popover')

  function toggle ({ newState }: ToggleEvent) {
    open.set(newState === 'open')
  }
  function popoverstate (node: HTMLDivElement, _: boolean) {
    return {
      update: (popover: boolean) => {
        if (!popover) node.hidePopover()
        else node.showPopover()
      }
    }
  }
</script>

<div
  {id}
  {popover}
  use:popoverstate={$open}
  role='dialog'
  style:--side-offset='{sideOffset}px'
  style:--side='{side} span-{span}'
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
    background: unset;
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
