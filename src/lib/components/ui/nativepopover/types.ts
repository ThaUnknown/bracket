import type { Writable } from 'svelte/store'

export interface PopoverContext {
  open: Writable<boolean>
  id: string
  toggle: () => void
  close: () => void
}
