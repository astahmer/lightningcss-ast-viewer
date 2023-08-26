import { Plugin, defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import * as fs from 'node:fs'

const wasmContentTypePlugin = {
  name: 'wasm-content-type-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm')
      }
      next()
    })
  },
}

function copyWasm(): Plugin {
  return {
    name: 'copy-wasm',
    generateBundle() {
      fs.copyFileSync('./node_modules/esbuild-wasm/esbuild.wasm', './dist/esbuild.wasm')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['lightningcss-wasm'],
  },
  plugins: [react(), wasmContentTypePlugin, copyWasm()],
})
