<script lang='ts'>
  import FilePreview from './filepreview.svelte'

  import type { FileContent } from 'matrix-js-sdk/lib/types'

  import { mxcToHttp } from '$lib/modules/matrix/attachment/url'

  export let content: FileContent

  $: name = content.filename ?? content.body
  $: size = content.info?.size ?? 0
  $: src = mxcToHttp(content.url ?? content.file!.url, content.file, size)

// handle some file formats such as pdfs and code text files with shikicodeblocks? serviceworker supports this.
</script>

<FilePreview {src} {name} {size} />
