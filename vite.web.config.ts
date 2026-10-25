import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sharedProxy } from './vite.proxy'

/**
 * 일반 웹(Vercel) 배포용 설정이에요. 토스 미니앱 빌드(vite.config.ts)와 완전히 분리돼 있어요.
 *
 * - `@toss/tds-mobile`은 앱인토스 밖에서 실행을 막기 때문에, 웹 번들에는 TDS와
 *   `@apps-in-toss/web-framework`를 넣지 않아요. (src/web 아래 코드만 진입점으로 써요)
 * - 데이터 로직(src/features/game-deals/api 등)은 미니앱과 그대로 공유해요.
 */
export default defineConfig({
  root: 'web',
  publicDir: 'public',
  envDir: '..',
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../dist-web',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    fs: { strict: false },
    proxy: sharedProxy,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
})
