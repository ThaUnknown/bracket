<script lang='ts'>
  import { marked, type TokenizerAndRendererExtension } from 'marked'
  import markedShiki from 'marked-shiki'
  import { codeToHtml } from 'shiki'

  import { colorScheme } from '$lib/utils'
  export let markdown = ''

  import './md.css'

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

  function render (el: HTMLDivElement, markdown: Promise<string>) {
    const update = async (markdown: Promise<string>) => {
      if (!sanitizer) {
        const { default: dompurify } = await import('dompurify')
        el.setHTMLUnsafe(dompurify.sanitize(await markdown, { ALLOWED_TAGS, ALLOWED_ATTR }))
      } else {
        el.setHTML(await markdown, { sanitizer })
      }
    }

    update(markdown)

    return { update }
  }
  const shiki = markedShiki({
    async highlight (code, lang) {
      return await codeToHtml(code, { lang, theme: $colorScheme === 'dark' ? 'github-dark' : 'github-light' })
    }
  })

  const mention: TokenizerAndRendererExtension = {
    name: 'mention',
    level: 'inline', // Is this a block-level or inline-level tokenizer?
    start: (src) => src.indexOf('@'),
    tokenizer (src: string) {
      const match = /@([^\s]+)/.exec(src)
      if (match) {
        return {
          type: 'mention',
          raw: match[0]
        }
      }
    },
    renderer (token) {
      return `<span class="markdown-mention">${token.raw}</span>`
    }
  }
</script>

<div use:render={marked.use(shiki).use({ extensions: [mention] }).parse(markdown, { async: true })} class='contents' />
