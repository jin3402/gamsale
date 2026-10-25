import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import aitDevtools from "@apps-in-toss/devtools/unplugin";
import { sharedProxy } from './vite.proxy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [aitDevtools.vite(), react()],
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
