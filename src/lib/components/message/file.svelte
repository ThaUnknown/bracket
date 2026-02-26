<script lang='ts'>
  import type { FileContent } from 'matrix-js-sdk/lib/types'

  import { mxcToHttp } from '$lib/modules/matrix/event'

  export let content: FileContent

  $: name = content.filename ?? content.body
  $: size = content.info?.size ?? 0
  $: src = mxcToHttp(content.url ?? content.file!.url, content.file, size)

// handle some file formats such as pdfs and code text files with shikicodeblocks? serviceworker supports this.
</script>

<a href={src} download={name}>{name}</a>
