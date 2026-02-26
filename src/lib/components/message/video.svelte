<script lang='ts'>
  import type { VideoContent } from 'matrix-js-sdk/lib/types'

  import { mxcToHttp } from '$lib/modules/matrix/event'

  export let content: VideoContent & { thumbnail_info?: { ['xyz.amorgan.blurhash']?: string } }

  $: name = content.filename ?? content.body
  $: size = content.info?.size ?? 0
  $: src = mxcToHttp(content.url ?? content.file!.url, content.file, size)
  $: duration = content.info?.duration ?? 0
  $: postersize = content.info?.thumbnail_info?.size ?? 0
  $: poster = mxcToHttp(content.info?.thumbnail_file?.url ?? content.info?.thumbnail_url ?? '', content.info?.thumbnail_file, postersize)
// $: blurhash = content.thumbnail_info?.['xyz.amorgan.blurhash']
</script>

{Math.round(size / 1024)}KB
{Math.round(duration / 1000)}s
{name}
<video {src} controls {poster} class='h-full' preload='none' />
