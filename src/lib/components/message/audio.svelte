<script lang='ts'>
  import type { AudioContent } from 'matrix-js-sdk/lib/types'

  import { mxcToHttp } from '$lib/modules/matrix/event'

  export let content: AudioContent

  $: duration = content.info?.duration ?? 0
  $: size = content.info?.size ?? 0
  $: src = mxcToHttp(content.url ?? content.file!.url, content.file, size)
  $: name = content.filename ?? content.body
</script>

{name} ({Math.round(duration / 1000)}s, {Math.round(size / 1024)}KB)
<audio controls {src} preload='none' />
