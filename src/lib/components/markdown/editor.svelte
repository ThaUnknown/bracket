<script lang='ts' context='module'>
  import OverType, { type OverTypeInstance } from 'overtype'
  import { codeToHtml } from 'shiki'

  import { cn, colorScheme } from '$lib/utils'

  import './md.css'

  export interface EditorContent {
    markdown: string
    html: string
    isMarkdown: boolean
    mentions: string[]
  }

  const LANG_MAP: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    rs: 'rust'
  }

  async function shikiHighlighter (code: string, language: string) {
    try {
      const highlighted = await codeToHtml(code, {
        lang: LANG_MAP[language] || language || 'text',
        theme: colorScheme.value === 'dark' ? 'github-dark' : 'github-light'
      })

      const match = highlighted.match(/<code[^>]*>([\s\S]*?)<\/code>/)
      return match ? match[1] : code
    } catch (error) {
      console.warn('Shiki highlighting failed:', error)
      return code
    }
  }

  const highlightCache = new Map()

  function syncShikiHighlighter (code: string, language: string) {
    const cacheKey = `${language}:${code.substring(0, 100)}`

    if (highlightCache.has(cacheKey)) {
      return highlightCache.get(cacheKey)
    }

    shikiHighlighter(code, language).then(result => {
      highlightCache.set(cacheKey, result)
      // hacky re-render
      OverType.setCodeHighlighter(syncShikiHighlighter)
    })

    return code
  }

  OverType.setCodeHighlighter(syncShikiHighlighter)
  // @ts-expect-error - no types available
  OverType.setCustomSyntax((html: string) => {
    return html.replace(/(^|[^\w])@([^\s]+)/g, '$1<span class="markdown-mention">@$2</span>')
  })
</script>

<script lang='ts'>
  let className: string | undefined | null = ''
  export let value = ''
  export { className as class }

  const htmlContentRegex = /^<div>(?:&nbsp;)*([\s\S]*)<\/div>$/

  export let placeholder = ''
  export let editor: OverTypeInstance | undefined = undefined

  export function getContent (): EditorContent {
    const html = (editor?.getCleanHTML() ?? '').match(htmlContentRegex)?.[1]?.trim() ?? ''
    const isMarkdown = html !== value
    const mentions = [...html.matchAll(/<span class="markdown-mention">(@[^\s]+)<\/span>/g)].map(m => m[1]!)
    return { markdown: value, html, isMarkdown, mentions }
  }

  function markdown (el: HTMLDivElement) {
    [editor] = new OverType(el, {
      toolbar: true,
      placeholder,
      value,
      autoResize: false,
      theme: {
        name: 'custom',
        colors: {
          bgPrimary: 'var(--foreground)',
          bgSecondary: 'var(--background)',
          text: 'var(--foreground)',
          textPrimary: 'var(--background)',
          textSecondary: 'var(--foreground)',
          h1: '#e06c75',
          h2: '#e5c07b',
          h3: '#98c379',
          strong: '#e5c07b',
          em: '#c678dd',
          link: '#61afef',
          code: '#98c379',
          codeBg: 'rgba(40, 44, 52, 0.5)',
          blockquote: '#5c6370',
          hr: '#3b4048',
          syntaxMarker: 'rgba(97, 175, 239, 0.5)',
          cursor: '#61afef',
          selection: 'rgba(97, 175, 239, 0.3)',
          listMarker: '#e5c07b',
          toolbarBg: 'var(--background)',
          toolbarBorder: '#3b4048',
          toolbarIcon: 'inherit',
          toolbarHover: 'var(--muted-foreground)',
          toolbarActive: 'var(--foreground)'
        }
      },
      onChange: (val: string) => {
        value = val.trim()
      }
    })

    return editor
  }
</script>

<div use:markdown
  class={cn(
    'placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-15 w-full overflow-clip border bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
    className
  )} />
