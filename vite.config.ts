import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

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

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['lightningcss-wasm'],
  },
  plugins: [react(), wasmContentTypePlugin],
})
