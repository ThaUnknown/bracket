<script lang='ts'>
  import { marked } from 'marked'
  export let markdown = ''

  const ALLOWED_TAGS = ['a', 'b', 'blockquote', 'br', 'center', 'del', 'div', 'em', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'code', 'span', 'strike', 'strong', 'ul', 'details', 'summary']
  const ALLOWED_ATTR = ['align', 'height', 'href', 'src', 'target', 'width', 'rel']

  // sanitizer is very gut, but very experimental and only supported since april 2026
  // eslint-disable-next-line no-undef
  const sanitizer = typeof Sanitizer !== 'undefined' && new Sanitizer({
    allowElements: ALLOWED_TAGS,
    allowAttributes: ALLOWED_TAGS.reduce<Record<string, string[]>>((acc, tag) => {
      acc[tag] = ALLOWED_ATTR
      return acc
    }, {})
  })
  if (sanitizer) sanitizer.removeUnsafe()

  function render (el: HTMLDivElement, markdown: string) {
    const update = async (markdown: string) => {
      if (!sanitizer) {
        const { default: dompurify } = await import('dompurify')
        el.setHTMLUnsafe(dompurify.sanitize(markdown, { ALLOWED_TAGS, ALLOWED_ATTR }))
      } else {
        el.setHTML(markdown, { sanitizer })
      }
    }

    update(markdown)

    return { update }
  }
</script>

<div use:render={marked.parse(markdown, { async: false })} class='contents' />
