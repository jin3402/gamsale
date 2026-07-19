import { defineConfig } from '@apps-in-toss/web-framework/config'

/**
 * 앱인토스 미니앱 런타임(WebView) 설정.
 * - 실제 배포/샌드박스 테스트 전에는 `appName`, `brand.displayName`, `brand.icon`, `permissions`를 콘솔 설정에 맞춰 변경하세요.
 */
export default defineConfig({
  appName: 'game-deal-alert', // 콘솔에 등록한 앱 ID(고유 키)
  brand: {
    displayName: '할인 게임 알림',
    // 토스 사용자에게 가장 익숙하고 신뢰감을 주는 '토스 블루' 컬러를 사용하여 직관적인 UI를 제공합니다.
    primaryColor: '#3182f6',
    // 콘솔의 앱 정보에 업로드된 이미지를 우클릭해 복사한 링크. 로컬 파일 경로가 아닌 URL을 사용해야 해요.
    icon: 'https://static.toss.im/appsintoss/icon-placeholder.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'vite build',
    },
  },
  // 추후 알림(Push) 권한 등이 필요하면 콘솔에서 권한을 설정하고 배열 안에 해당 권한을 추가해 주세요.
  permissions: [],
})
