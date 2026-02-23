import { defineConfig, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

const requestLogger = () => ({
  name: 'lobbyha-request-logger',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((req: IncomingMessage, _res: ServerResponse, next: () => void) => {
      if (req.url) {
        const [pathname, query = ''] = req.url.split('?')
        const qs = query ? `?${query}` : ''
        // Rewrite clean URLs AND .html URLs to the actual multi-page entry files
        if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin.html') {
          req.url = `/admin.html${qs}`
        } else if (pathname === '/guest' || pathname === '/guest/') {
          req.url = `/index.html${qs}`
        } else if (pathname === '/setup' || pathname === '/setup/' || pathname === '/setup.html') {
          req.url = `/setup.html${qs}`
        }
      }
      next()
    })
  }
})

export default defineConfig({
  plugins: [react(), requestLogger()],
  cacheDir: resolve(__dirname, '../../run/.vite/dashboard'),
  server: {
    proxy: {
      '/api/websocket': {
        target: 'ws://localhost:3000',
        ws: true
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        guest: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        setup: resolve(__dirname, 'setup.html'),
      }
    }
  }
})
