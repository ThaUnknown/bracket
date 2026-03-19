<script lang='ts'>

  import { createEventDispatcher } from 'svelte'

  import EmojiPicker, { type EmojiInfo } from './emoji-picker.svelte'

  import type { OverTypeInstance } from 'overtype'
  import type { Writable } from 'svelte/store'

  import { Editor, type EditorContent } from '$lib/components/markdown'
  import { Button, buttonVariants } from '$lib/components/ui/button'
  import { cn } from '$lib/utils'

  const dispatch = createEventDispatcher<{ send: undefined, attach: undefined }>()

  let editor: OverTypeInstance

  export let getContent: () => EditorContent
  export let setValue: (val?: string) => void
  export let value = ''

  let open: Writable<boolean>

  function pickEmoji ({ detail }: CustomEvent<EmojiInfo>) {
    $open = false
    editor.focus()
    editor.insertAtCursor(detail.native)
  }
</script>

<div class='flex px-1.5 py-3 gap-2 border-black/10 dark:border-white/10 border-t'>
  <Button variant='ghost' size='icon-sm' class='text-xl' on:click={() => dispatch('attach')}>+</Button>
  <Editor bind:getContent bind:setValue bind:value bind:editor class='py-1.25' on:send />
  <EmojiPicker on:emoji={pickEmoji} class={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'hover:text-lg transition-[font-size]')}>
    😀
  </EmojiPicker>
</div>
