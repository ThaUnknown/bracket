<script lang='ts'>
  import { ProgressBar } from '@prgm/sveltekit-progress-bar'

  import type { WebManifest } from '@json-types/web-manifest'

  import { page } from '$app/state'

  import './layout.css'
  import '@fontsource-variable/nunito'
  import '@fontsource/geist-mono'
  import '@fontsource/roboto'

  type WebManifestWithExtras = WebManifest & Record<string, unknown>

  const manifest = {
    name: 'Bracket',
    short_name: 'Bracket',
    start_url: `${page.url.origin}/#/`,
    display: 'fullscreen',
    display_override: [
      'window-controls-overlay'
    ],
    lang: 'en-US',
    orientation: 'landscape',
    background_color: '#000000', // TODO: this should compute based on the CSS theme colors
    theme_color: '#000000',
    scope: `${page.url.origin}/`,
    description: 'Chat client.',
    // TODO: test images, works for now
    icons: [
      {
        src: `${page.url.origin}/128.png`,
        sizes: '128x128',
        type: 'image/png'
      },
      {
        src: `${page.url.origin}/512.png`,
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    screenshots: [
      {
        src: `${page.url.origin}/ss1.png`,
        sizes: '1080x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Chat view'
      },
      {
        src: `${page.url.origin}/ss2.png`,
        sizes: '408x728',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Server list'
      }
    ],
    intent_filters: {
      scope_url_scheme: 'https',
      scope_url_host: `${page.url.host}/`,
      scope_url_path: '/'
    },
    capture_links: 'existing-client-navigate',
    launch_handler: {
      route_to: 'existing-client',
      navigate_existing_client: 'always'
    },
    url_handlers: [{ origin: page.url.origin }],
    file_handlers: [
      {
        action: `${page.url.origin}/#/`,
        accept: {
          'video/x-matroska': [
            '.mkv',
            '.mk3d',
            '.mks'
          ]
        }
      }
    ]
  } satisfies WebManifestWithExtras

  const blobURL = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/json' }))
</script>

<svelte:head>
  <link rel='manifest' href={blobURL} />
</svelte:head>

<ProgressBar class='text-foreground' />
<slot />
