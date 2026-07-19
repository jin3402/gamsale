# 🎮 할인 게임 알림 (Discount Game Alert)

스팀(Steam) 등 주요 플랫폼의 게임 할인 소식을 한눈에 모아 보고, 원하는 게임에 알림을 설정할 수 있는
앱인토스(Apps In Toss) 환경의 미니앱입니다.

`중간지점찾기` 프로젝트에서 사용한 TDS(Toss Design System) 연동 방식과 프로젝트 구성을 그대로 이어받아
구성했습니다.

## ✨ 주요 기능

* **할인 게임 목록**: 현재 할인 중인 게임을 썸네일, 할인율, 가격과 함께 리스트로 보여줍니다.
* **게임 검색**: 이름으로 원하는 게임을 빠르게 찾을 수 있습니다.
* **할인 알림 설정**: 게임별로 스위치를 켜서 할인 알림을 받을 게임을 관리할 수 있습니다. (현재는 UI만 제공하며, 실제 알림 발송은 백엔드 연동이 필요합니다.)
* **TDS(Toss Design System) 적용**: 토스 앱과 이질감 없는 깔끔하고 직관적인 UI/UX를 제공합니다.

## 🛠 기술 스택

* **Framework**: React, Vite, TypeScript
* **Platform**: Apps In Toss (앱인토스) Web Framework
* **Design**: Toss Design System (TDS) 기반 컴포넌트 (`@toss/tds-mobile`, `@toss/tds-mobile-ait`)

## 📁 프로젝트 구조

```
src/
├── App.tsx                 # 최상위 화면 조립
├── main.tsx                # TDSMobileAITProvider로 앱 감싸기
├── index.css / App.css     # 전역/공용 스타일
└── features/
    └── game-deals/
        ├── GameDealList.tsx # 할인 게임 목록 화면
        ├── api/             # 실시간 스토어·환율 API 연동
        └── types.ts         # GameDeal 타입 정의
```

## 🔗 TDS 연동 방식

`중간지점찾기`와 동일하게 다음 흐름으로 TDS를 연동했습니다.

1. `package.json`에 `@toss/tds-mobile`, `@toss/tds-mobile-ait`, `@apps-in-toss/web-framework`를 의존성으로 추가합니다.
2. `src/main.tsx`에서 앱 전체를 `TDSMobileAITProvider`로 감싸 TDS 컴포넌트가 정상적으로 동작하도록 합니다.

    ```tsx
    import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'

    createRoot(document.getElementById('root')!).render(
      <TDSMobileAITProvider>
        <App />
      </TDSMobileAITProvider>,
    )
    ```

3. 화면 구성은 `Top`, `List`/`ListRow`, `Badge`, `Switch`, `TextField`, `Button` 등 `@toss/tds-mobile` 컴포넌트로 만듭니다.
4. `granite.config.ts`에서 앱 이름, 브랜드 색상, 아이콘, 권한 등 런타임 설정을 관리합니다.

## 🚀 시작하기

```bash
npm install
npm run dev
```

배포 전에는 `granite.config.ts`의 `appName`, `brand.displayName`, `brand.icon`, `permissions`를
콘솔에 등록한 값에 맞게 변경해 주세요.

## 📌 다음 단계 (TODO)

* [ ] Steam Store API(또는 자체 백엔드)와 연동해 실시간 할인 데이터로 교체하기
* [ ] 알림 스위치 상태를 서버에 저장하고, 실제 푸시 알림 발송 로직 붙이기
* [ ] 스팀 외 다른 플랫폼(에픽게임즈 등) 데이터 추가하기
