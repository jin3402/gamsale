# 겜세일 (GemSale)

> 스팀·에픽·콘솔 할인 게임을 한눈에, 놓치지 않게

토스 앱인토스(Apps in Toss) 미니앱으로 만든 **멀티 플랫폼 게임 할인 큐레이션 서비스**입니다.  
Steam, Epic Games, Xbox, PlayStation, Nintendo Switch의 할인 정보를 모아 보여주고, 위시리스트·공유·스토어 이동·광고·프로모션까지 실제 운영 가능한 수준으로 연동했습니다.

**GitHub:** [jin3402/gamsale](https://github.com/jin3402/gamsale)  
**플랫폼:** Apps in Toss WebView · TDS(Toss Design System)

---

## 포트폴리오 한줄 요약

> CORS·스냅샷·광고·프로모션·콘텐츠 필터까지, **미니앱 실서비스 제약을 뚫으면서** 할인 게임 큐레이션 제품을 끝까지 만든 프로젝트입니다.

---

## 문제 정의

- 게임 할인은 Steam / Epic / Xbox / PS / Nintendo에 흩어져 있어 한눈에 보기 어렵습니다.
- 앱인토스 WebView는 외부 스토어 API에 **CORS 제한**이 있어, 일반 웹처럼 실시간 fetch만으로는 서비스를 완성할 수 없습니다.
- 토스 미니앱은 **TDS UI**, 광고 정책, 프로모션 검수, 선정성 콘텐츠 기준을 동시에 만족해야 합니다.

## 해결

| 영역 | 접근 |
|------|------|
| 데이터 | Steam/Epic은 CheapShark 실시간 API, 콘솔은 빌드 타임 스냅샷 + 런타임 폴백 |
| UX | TDS 기반 카드 UI, 플랫폼 필터, 위시리스트, 게임 탭 시 액션시트 |
| 수익화 | 배너 광고 + 스토어 이동 전 전면형 광고 |
| 성장 | 앱 진입 시 프로모션 포인트 지급(기기당 1회) |
| 안전 | 닌텐도 성인·선정성·저품질 타이틀 필터 |

---

## 주요 기능

### 1. 멀티 플랫폼 할인 목록
- Steam / Epic / Xbox / PlayStation / Nintendo Switch / 전체 탭
- 할인율·가격·썸네일 카드 UI
- 세션 단위 상위 노출 셔플로, 매번 같은 게임만 맨 위에 나오지 않도록 처리

### 2. 무한에 가까운 더보기 (부하 최소화)
- 초기에는 약 150개만 로드
- 이미 받아둔 목록을 다 본 뒤에만 Steam/Epic 다음 페이지를 실시간으로 추가 fetch
- 처음부터 전체를 미리 받지 않아 API·번들 부하를 줄임

### 3. 게임 액션시트
- 카드 탭 → **스토어에서 보기** / **공유하기**
- 스토어 이동 전 전면 광고 시청 후 이동
- 하트(찜)는 카드와 분리되어 독립 동작

### 4. 위시리스트 & 공유
- 기기 로컬 저장
- 토스 네이티브 공유 → Web Share API 폴백
- 공유 문구·버튼 라벨 통일

### 5. 프로모션
- 서비스 이용(앱 진입) 시 토스 포인트 지급
- 기기당 1회 중복 지급 방지
- 테스트 코드(`TEST_…`) / 운영 코드 전환 플래그

### 6. 콘텐츠 안전
- 닌텐도 목록에서 성인·선정성·저품질 타이틀 키워드 필터
- 스냅샷 생성 시점 + 런타임 이중 필터

---

## 기술 스택

- **Language / UI:** TypeScript, React 18, Vite
- **Platform:** `@apps-in-toss/web-framework` (Granite / WebView)
- **Design System:** `@toss/tds-mobile`, `@toss/tds-mobile-ait`
- **Data:** CheapShark API, PlayStation GraphQL, Xbox Store Edge, Nintendo KR Store HTML/Price API
- **Ops:** 빌드 전 스냅샷 생성(`prebuild`), `.ait` 번들 배포

---

## 아키텍처

```text
[토스 미니앱 WebView]
        │
        ├─ Steam / Epic  ──► CheapShark (CORS 허용, 실시간)
        │
        ├─ Xbox / PS / Nintendo
        │     ├─ 개발: Vite 프록시로 실시간 가능
        │     └─ 운영: prebuild 스냅샷 번들 → 런타임 사용
        │
        ├─ 광고 ──► load/showFullScreenAd, TossAds Banner
        └─ 프로모션 ──► grantPromotionReward (진입 시 1회)
```

### 왜 스냅샷인가?
토스 WebView에서는 Nintendo / PlayStation / Xbox 스토어 API가 CORS로 막히는 경우가 많습니다.  
그래서 **빌드 시점(`npm run prebuild`)에 Node에서 목록을 받아 TypeScript 스냅샷으로 넣고**, 운영 WebView에서는 그 스냅샷을 보여줍니다. 실패 시에도 이전 스냅샷을 유지해 빈 화면을 피합니다.

---

## 프로젝트 구조

```text
src/features/game-deals/
├── GameDealList.tsx          # 메인 피드
├── GameDealCard.tsx          # 할인 카드
├── DealActionSheet.tsx       # 공유 / 스토어 이동
├── ads/                      # 배너·전면 광고
├── api/                      # 플랫폼별 fetch + 스냅샷 + 필터
├── promotion/                # 진입 리워드
├── wishlist/                 # 찜·공유
└── share.ts                  # 공용 공유 유틸

scripts/
└── generate-deal-snapshots.mjs   # 빌드 전 콘솔 딜 스냅샷 생성
```

---

## 개발하며 겪은 이슈와 결정

| 이슈 | 결정 |
|------|------|
| 콘솔 스토어 CORS | 빌드 타임 스냅샷 + 이전 스냅샷 폴백 |
| 상위 게임이 항상 같음 | 할인율 상위 풀을 세션 시드로 셔플 |
| 탭 전환마다 광고 | 탭 전환 광고 제거, 스토어 이동 시에만 전면 광고 |
| 리스트를 무한으로 늘리고 싶음 | 150개 이후부터 Steam/Epic만 페이지 단위 추가 로드 |
| 닌텐도 선정성 타이틀 | 키워드 필터를 스냅샷/런타임에 이중 적용 |
| 미니앱 이름 반려 | 콘솔 등록명과 `brand.displayName`을 동일하게 맞춤 |

더 자세한 기록은 [`docs/트러블슈팅-로그.md`](./docs/트러블슈팅-로그.md)를 참고하세요.

---

## 시작하기

```bash
npm install
npm run dev
```

빌드(스냅샷 생성 포함):

```bash
npm run build
```

### 설정
- `granite.config.ts` — `appName`, `brand.displayName`, `brand.icon`
- 광고 그룹 ID — `src/features/game-deals/ads/adIds.ts`
- 프로모션 코드 — `src/features/game-deals/promotion/usePromotionReward.ts`

> 공개 저장소용으로 복제할 때는 **본인 콘솔의 광고 ID·프로모션 코드**로 교체해 주세요.

---

## 역할 / 기여

- 앱인토스 WebView 미니앱 기획·개발 전반
- TDS UI 구성 및 액션시트/위시리스트 UX
- 멀티 스토어 데이터 파이프라인(실시간 + 스냅샷)
- 광고·프로모션 연동, 콘텐츠 필터, 성능·부하 고려한 페이지네이션

---

## 라이선스

개인 포트폴리오 목적의 프로젝트입니다.  
Steam / Epic / Xbox / PlayStation / Nintendo 및 토스 관련 상표·콘텐츠의 권리는 각 권리자에게 있습니다.
