<script lang='ts'>
  import type { StickerEventContent } from 'matrix-js-sdk/lib/types'

  import { mxcToHttp } from '$lib/modules/matrix/event'

  export let content: StickerEventContent

  $: src = mxcToHttp(content.url)
  $: size = content.info?.size ?? 0
</script>

{Math.round(size / 1024)}KB
<img {src} alt={content.body} class='h-full min-h-0 object-contain bg-transparent' loading='lazy' />
