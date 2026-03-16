import { resolve } from 'node:path'

import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import license from 'rollup-plugin-license'
import { defineConfig, type Plugin } from 'vite'
import devtoolsJson from 'vite-plugin-devtools-json'

// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const viteServerConfig = () => ({
  name: 'add-headers',
  configureServer: (server) => {
    server.middlewares.use((req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
      next()
    })
  }
}) as Plugin

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    viteServerConfig(),
    license({
      thirdParty: {
        allow: '(MIT OR Apache-2.0 OR ISC OR BSD-3-Clause OR BSD-2-Clause)',
        output: resolve(import.meta.dirname, './build/LICENSE.txt'),
        includeSelf: true
      }
    }),
    devtoolsJson()
  ],
  server: {
    port: 7345,
    forwardConsole: false
  },
  build: {
    target: 'esnext',
    sourcemap: true
  },
  ssr: {
    target: 'webworker'
  },
  worker: {
    format: 'es'
  },
  devtools: {
    enabled: false
  },
  optimizeDeps: {
    exclude: ['@matrix-org/matrix-sdk-crypto-wasm']
  }
})
