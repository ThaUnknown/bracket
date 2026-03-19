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
  OverType.setCustomSyntax((html: string) => html
    .replace(/(^|[^\w])([A-Za-z0-9+.-]*:\/\/[^\s<>"'`]+)/g, (_match, prefix: string, uriMatch: string) => {
      const uri = uriMatch.replace(/[.,!?;:]+$/u, '')
      if (!uri) return `${prefix}${uriMatch}`

      const trailing = uriMatch.slice(uri.length)
      return `${prefix}<a href="${uri}" target="_blank" rel="noopener noreferrer" style="--link: var(--accent-foreground) !important">${uri}</a>${trailing}`
    })
    .replace(/(^|[^\w])@([^\s]+)/g, '$1<span class="markdown-mention">@$2</span>')
  )
</script>

<script lang='ts'>
  import { createEventDispatcher } from 'svelte'

  let className: string | undefined | null = ''
  export let value = ''
  export { className as class }

  export let editor: OverTypeInstance | undefined

  const dispatch = createEventDispatcher<{ send: undefined }>()

  export function getContent (): EditorContent {
    const regex = /(<span class="code-fence"[^>]*>[\s\S]*?<\/span>)/g
    const rendered = editor?.getRenderedHTML() ?? ''
    let html = rendered.replace(regex, '')
    html = html.replace(/<span class="syntax-marker[^"]*">.*?<\/span>/g, '')
    // Remove OverType-specific classes
    html = html.replace(/\sclass="(bullet-list|ordered-list|code-fence|hr-marker|blockquote|url-part)"/g, '')
    // Clean up empty class attributes
    html = html.replace(/\sclass=""/g, '')
    const content = html.match(/^<div>(?:&nbsp;)*([\s\S]*)<\/div>(?:&nbsp;)*$/)?.[1]?.trim() ?? ''
    const isMarkdown = content !== value
    const mentions = [...html.matchAll(/<span class="markdown-mention">(@[^\s]+)<\/span>/g)].map(m => m[1]!)
    return { markdown: value, html, isMarkdown, mentions }
  }

  export function setValue (val?: string) {
    editor?.setValue(val ?? '')
  }

  function markdown (el: HTMLDivElement) {
    [editor] = new OverType(el, {
      placeholder: 'Type a message...',
      value,
      autoResize: true,
      minHeight: '0',
      padding: '0px',
      maxHeight: '300',
      textareaProps: {
        rows: 1
      },
      spellcheck: true,
      smartLists: true,
      toolbar: false,
      toolbarButtons: [
        {
          name: 'custom',
          icon: '...',
          action: ({ editor, getValue }) => {

          }
        }
      ],
      onKeydown: (event) => {
        // TODO: handle mobile
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          dispatch('send')
        }
      },
      theme: {
        name: 'custom',
        colors: {
          bgPrimary: 'transparent',
          bgSecondary: 'transparent',
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
          toolbarBorder: 'transparent',
          toolbarIcon: 'var(--muted-foreground)',
          toolbarHover: 'var(--background)',
          toolbarActive: 'var(--foreground)',
          placeholder: 'var(--muted-foreground)'
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
    'flex w-full overflow-clip font-mono',
    className
  )} />
