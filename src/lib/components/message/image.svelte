<script lang='ts'>
  import type { ImageContent } from 'matrix-js-sdk/lib/types'

  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'

  export let content: ImageContent & { info?: { ['xyz.amorgan.blurhash']?: string } }

  $: name = content.filename ?? content.body
  $: size = content.info?.size ?? 0
  $: src = mxcToHttp(content.url ?? content.file!.url, content.file, size)
  $: width = content.info?.w ?? 0
  $: height = content.info?.h ?? 0
// $: blurhash = content.info?.['xyz.amorgan.blurhash']
</script>

({width}x{height}, {Math.round(size / 1024)}KB)
<img {src} alt={name} class='h-full object-contain min-h-0' decoding='async' loading='lazy' />
