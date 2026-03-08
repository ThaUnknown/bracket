<script lang='ts'>
  import type { StickerEventContent } from 'matrix-js-sdk/lib/types'

  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'

  export let content: StickerEventContent

  $: src = mxcToHttp(content.url)
  $: size = content.info?.size ?? 0
</script>

{Math.round(size / 1024)}KB
<img {src} alt={content.body} class='h-full object-contain min-h-0' decoding='async' loading='lazy' />
