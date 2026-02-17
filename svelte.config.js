import { readdir, readFile, writeFile, glob } from 'node:fs/promises'
import { join, basename } from 'node:path'

import staticAdapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { execSync } from 'node:child_process'

/**
 * Custom adapter wrapper that extends @sveltejs/adapter-static
 * to inject font preload links after the build is complete
 *
 * @param {import('@sveltejs/adapter-static').AdapterOptions & {fontNames?: string[], formats?: string[]}} options
 * @returns {import('@sveltejs/kit').Adapter}
 */
const adapterWithFontPreload = (options = {}) => {
  const { fontNames = ['nunito'], formats = ['woff2', 'woff'], ...staticOptions } = options

  const baseAdapter = staticAdapter(staticOptions)

  return {
    name: 'adapter-static-with-font-preload-and-workers',

    async adapt (builder) {
      await baseAdapter.adapt(builder)

      const outDir = './build' // Static adapter always writes to 'build' directory
      try {
        const assetsDir = join(outDir, '_app/immutable/assets')

        const assetFiles = await readdir(assetsDir)
        const fontFiles = assetFiles.filter(file => {
          const lowerFileName = file.toLowerCase()
          return formats.some(format => lowerFileName.endsWith(`.${format}`)) &&
          fontNames.some(name => lowerFileName.includes(name.toLowerCase()))
        })

        if (fontFiles.length === 0) return

        console.log('Found fonts to preload:', fontFiles)

        const preloadLinks = fontFiles.map(fontFile => {
          const format = fontFile.split('.').pop()
          return `\t<link rel="preload" href="/_app/immutable/assets/${fontFile}" as="font" type="font/${format}" crossorigin>`
        }).join('\n')

        const htmlPath = join(outDir, '/index.html')

        try {
          const html = /** @type {string} */ (await readFile(htmlPath, 'utf-8'))

          const headPattern = '</head>'
          const replacement = `${preloadLinks}\n${headPattern}`

          const updated = html.replace(headPattern, replacement)

          if (updated !== html) {
            await writeFile(htmlPath, updated, 'utf-8')
            console.log(`Added font preload links to ${htmlPath}`)
          }
        } catch (error) {
          console.log(`Could not process ${htmlPath}:`, error)
        }
      } catch (error) {
        console.error('Error injecting font preloads:', error)
      }

      // copy index.html to offline.html for offline fallback for service worker
      try {
        const indexPath = join(outDir, 'index.html')
        const offlinePath = join(outDir, 'offline.html')
        const indexHtml = /** @type {string} */ (await readFile(indexPath, 'utf-8'))
        await writeFile(offlinePath, indexHtml, 'utf-8')
        console.log('Created offline.html for service worker offline fallback')
      } catch (error) {
        console.error('Error creating offline.html for service worker:', error)
      }
    }
  }
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    runes: false
  },
  onwarn: (warning, handler) => {
    if (warning.code.includes('a11y')) return
    if (warning.code === 'element_invalid_self_closing_tag') return
    handler?.(warning)
  },
  preprocess: vitePreprocess({ }),
  kit: {
    adapter: adapterWithFontPreload({
      fallback: 'index.html',
      fontNames: ['nunito-latin-wght'],
      formats: ['woff2', 'woff']
    }),
    version: {
      name: execSync('git rev-parse HEAD').toString().trim()
    },
    alias: {
      'lucide-svelte/dist/Icon.svelte': './node_modules/lucide-svelte/dist/Icon.svelte'
    },
    serviceWorker: {
      files: (filepath) => {
        return !['video.mkv', 'NotoSansHK.woff2', 'NotoSansJP.woff2', 'NotoSansKR.woff2'].includes(filepath)
      }
    }
  },
  runtime: ''
}

export default config
