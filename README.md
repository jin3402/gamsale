# 겜세일

토스 앱 안에서 Steam·Epic·Xbox·PlayStation·Nintendo Switch 할인 게임을 한 목록으로 보여주는 앱인토스(Apps in Toss) 미니앱입니다. 개인 프로젝트로 기획부터 배포까지 혼자 진행했습니다.

- 플랫폼: 앱인토스 WebView 미니앱 (`game-deal-alert`, 현재 버전 1.0.3)
- 저장소에는 배포 링크가 없습니다. 토스 앱의 미니앱으로만 접근할 수 있습니다.

## 주요 기능

- 플랫폼별/전체 할인 목록, 할인율 상위 30개는 앱을 열 때마다 순서를 섞어 노출
- 10개씩 '더보기', 처음 받은 150개를 다 보면 Steam·Epic 다음 페이지를 그때 요청
- 게임 카드 → 액션시트(스토어에서 보기 / 공유하기), 스토어 이동 전 전면 광고
- 위시리스트(기기 저장), 토스 공유 → Web Share API 순서로 공유
- 목록 중간 배너 광고, 앱 진입 시 프로모션 포인트 지급(기기당 1회)
- 닌텐도 목록의 선정성·저품질 타이틀 필터

## 기술 스택

TypeScript, React 18, Vite, `@apps-in-toss/web-framework`, TDS(`@toss/tds-mobile`), Vitest + Testing Library
데이터: CheapShark API(Steam·Epic), PlayStation Store GraphQL, Microsoft Store 검색 API, 닌텐도 KR 스토어 HTML·가격 API

## 문제와 해결

**1. WebView에서 콘솔 스토어 API가 CORS로 막힘**
로컬에서는 Vite 프록시로 보이던 Xbox·PlayStation·Nintendo 목록이 토스 WebView에 올리면 비었습니다. 세 스토어 모두 브라우저 Origin 호출을 허용하지 않았고, CORS를 허용하는 CheapShark(Steam·Epic)만 실시간 호출이 가능했습니다.
→ `prebuild`에서 Node로 세 스토어를 받아 TypeScript 스냅샷으로 번들에 넣고, 운영 WebView는 스냅샷을 씁니다. 받아오기가 실패하면 이전 스냅샷을 그대로 둬서 빈 화면을 피합니다.
관련: `scripts/generate-deal-snapshots.mjs`, `src/features/game-deals/api/consoleSnapshots.ts`, `api/config.ts`

**2. CheapShark 요청 제한(429)**
플랫폼 전환과 '전체' 탭에서 요청이 겹치며 429가 났습니다.
→ 요청을 한 줄로 세워 800ms 간격을 두고, 같은 요청은 10분간 메모리·sessionStorage 캐시로 돌려줍니다. 429는 재시도하지 않고 바로 안내합니다(재시도가 차단을 길게 만들 수 있어서).
관련: `api/cheapSharkRequest.ts`

**3. 검수 기준에 맞춘 선정성 콘텐츠 필터**
닌텐도 KR 할인 목록에는 선정적인 저가 타이틀이 섞여 있습니다.
→ 스냅샷을 만들 때 한 번, 앱에서 읽을 때 한 번 더 거릅니다. 두 곳이 같은 규칙 파일을 import합니다(예전에는 정규식을 복사해 두었다가 규칙이 서로 달라진 적이 있습니다).
관련: `api/contentRules.js`, `api/contentFilter.ts`

**4. 광고가 스토어 이동을 막지 않게**
전면 광고를 본 뒤 스토어로 이동하는데, 광고가 로드되지 않으면 사용자가 버튼을 눌러도 아무 일도 일어나지 않을 수 있습니다.
→ 라이브 광고 ID 로드가 실패하면 테스트 ID로 한 번 바꾸고, 짧게 재시도합니다. 그래도 4초 안에 광고가 뜨지 않거나 지원하지 않는 환경이면 바로 스토어로 이동합니다.
관련: `src/features/game-deals/ads/interstitialController.ts` (동작별 테스트 포함)

더 자세한 개발 기록은 [`docs/트러블슈팅-로그.md`](./docs/트러블슈팅-로그.md)에 있습니다.

## 구조

```text
scripts/generate-deal-snapshots.mjs   # 빌드 전 콘솔 스토어 스냅샷 생성
src/features/game-deals/
├── GameDealList.tsx                  # 메인 피드 (필터, 더보기, 광고 슬롯)
├── GameDealCard.tsx / DealActionSheet.tsx
├── useGameDeals.ts / useDealPaging.ts
├── api/        # 스토어별 클라이언트, CheapShark 요청·캐시, 스냅샷, 콘텐츠 필터, 스토어 링크
├── ads/        # 배너, 전면 광고 컨트롤러
├── promotion/  # 진입 프로모션 지급
└── wishlist/   # 찜 저장·공유
```

## 로컬 실행

Node 22에서 확인했습니다.

```bash
npm ci
npm run dev          # http://localhost:5173, 외부 API는 Vite 프록시로 호출
npm test             # Vitest
npm run lint
npm run typecheck
npm run build        # prebuild(스냅샷 갱신) → ait build → game-deal-alert.ait
```

- `npm run build`는 스냅샷을 새로 받기 위해 네트워크가 필요합니다. 실패한 플랫폼은 이전 스냅샷을 유지합니다.
- 광고·공유·프로모션은 토스 앱(샌드박스/QR 테스트)에서만 동작하고, 일반 브라우저에서는 건너뜁니다.

## 환경변수

모두 선택 사항입니다. 예시는 `.env.example`에 있습니다.

| 이름 | 용도 |
|---|---|
| `VITE_USD_KRW_RATE` | 환율 API 실패 시 폴백 환율 |
| `VITE_USE_CHEAPSHARK_PROXY`, `VITE_USE_NINTENDO_PROXY`, `VITE_USE_PLAYSTATION_PROXY`, `VITE_USE_XBOX_PROXY`, `VITE_USE_FX_PROXY` | 운영 빌드에서도 프록시 경로로 호출 |

광고 그룹 ID(`ads/adIds.ts`)와 프로모션 코드(`promotion/usePromotionReward.ts`)는 앱인토스 콘솔에서 발급한 식별자라 코드에 있습니다. 복제해서 쓸 때는 본인 콘솔 값으로 바꿔야 합니다.

## 한계와 다음 단계

- 콘솔 딜은 빌드 시점 데이터라 다시 빌드·배포해야 갱신됩니다. 실시간으로 바꾸려면 CORS를 대신 처리할 서버 프록시가 필요합니다.
- PlayStation·Xbox는 미국 스토어 달러 가격을 환율로 원화 환산한 값이라 한국 스토어 실제 가격과 다를 수 있습니다.
- 스냅샷 스크립트의 PlayStation·Xbox 파싱 로직은 아직 런타임 클라이언트와 중복돼 있습니다(콘텐츠 필터 규칙만 공유).
- 프로모션은 `IS_PROMOTION_TEST_PHASE` 플래그로 테스트/운영 코드를 바꾸며, 저장소의 현재 값은 `true`(테스트 코드)입니다.

## 라이선스

개인 포트폴리오 프로젝트입니다. 각 게임 스토어와 토스 관련 상표·콘텐츠의 권리는 각 권리자에게 있습니다.
