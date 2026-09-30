import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const nintendoStoreProxy = {
  target: 'https://store.nintendo.co.kr',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/nintendo-store/, ''),
  headers: {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
}

const nintendoPriceProxy = {
  target: 'https://api.ec.nintendo.com',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/nintendo-price/, ''),
}

const sharedProxy = {
  '/api/cheapshark': {
    target: 'https://www.cheapshark.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/cheapshark/, '/api/1.0'),
  },
  '/api/fx': {
    target: 'https://open.er-api.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/fx/, '/v6'),
  },
  '/api/nintendo-store': nintendoStoreProxy,
  '/api/nintendo-price': nintendoPriceProxy,
  '/api/ps-graphql': {
    target: 'https://web.np.playstation.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/ps-graphql/, ''),
    headers: {
      Origin: 'https://store.playstation.com',
      Referer: 'https://store.playstation.com/',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  },
  '/api/xbox': {
    target: 'https://storeedgefd.dsx.mp.microsoft.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/xbox/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: sharedProxy,
  },
  preview: {
    port: 5173,
    strictPort: true,
    proxy: sharedProxy,
  },
})
