<script lang='ts' context='module'>
  export interface EmojiInfo {
    id: string
    name: string
    native: string
    unified: string
    keywords: string[]
    shortcodes: string
    emoticons?: string[]
  }
</script>

<script lang='ts'>
  import { Picker } from 'emoji-mart'
  import { createEventDispatcher } from 'svelte'

  import type { HTMLAttributes } from 'svelte/elements'
  import type { Writable } from 'svelte/store'

  import * as Popover from '$lib/components/ui/nativepopover'

  const dispatch = createEventDispatcher<{emoji: EmojiInfo}>()

  function picker (node: HTMLDivElement) {
    const picker = new Picker({
      data: async () => (await import('@emoji-mart/data/sets/15/all.json')).default,
      theme: 'auto',
      autoFocus: false,
      onEmojiSelect: (emoji: EmojiInfo) => {
        dispatch('emoji', emoji)
        $open = false
      },
      noCountryFlags: false,
      custom: [],
      previewPosition: 'top',
      emojiVersion: 15,
      set: 'native'
    }) as unknown as HTMLElement

    const sheet = new CSSStyleSheet()
    sheet.replaceSync('#root, .sticky { background-color: inherit !important; } .scroll::-webkit-scrollbar { display: none; }')
    picker.shadowRoot?.adoptedStyleSheets.push(sheet)

    node.appendChild(picker as unknown as HTMLElement)
  }

  type $$Props = HTMLAttributes<HTMLDivElement>

  let open: Writable<boolean>
</script>

<Popover.Root bind:open>
  <Popover.Trigger {...$$restProps}>
    <slot />
  </Popover.Trigger>
  <Popover.Content side='top' span='left'>
    <div class='bg-background rounded-[10px]' use:picker />
  </Popover.Content>
</Popover.Root>
