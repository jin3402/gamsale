/**
 * 개발 중에는 Vite 프록시를 써요.
 * Nintendo/PlayStation은 토스 WebView CORS 때문에 프로덕션에서 직접 호출이 막혀요.
 * → 빌드 시 `npm run snapshot:deals` 스냅샷을 번들에 넣고, 런타임은 그걸 사용해요.
 * CheapShark만 CORS가 열려 직접 호출이 가능해요.
 * Xbox도 CORS가 막혀 스냅샷을 사용해요.
 */
const useDevProxy = import.meta.env.DEV

export const CHEAPSHARK_BASE_URL =
  useDevProxy || import.meta.env.VITE_USE_CHEAPSHARK_PROXY === 'true'
    ? '/api/cheapshark'
    : 'https://www.cheapshark.com/api/1.0'

/** 한국 닌텐도 스토어 (일본 eShop 제외) */
export const NINTENDO_STORE_BASE_URL =
  useDevProxy || import.meta.env.VITE_USE_NINTENDO_PROXY === 'true'
    ? '/api/nintendo-store'
    : 'https://store.nintendo.co.kr'

/** 한국 닌텐도 가격 API */
export const NINTENDO_PRICE_BASE_URL =
  useDevProxy || import.meta.env.VITE_USE_NINTENDO_PROXY === 'true'
    ? '/api/nintendo-price'
    : 'https://api.ec.nintendo.com'

/** PlayStation Store GraphQL (할인 목록) */
export const PLAYSTATION_GRAPHQL_BASE_URL =
  useDevProxy || import.meta.env.VITE_USE_PLAYSTATION_PROXY === 'true'
    ? '/api/ps-graphql'
    : 'https://web.np.playstation.com'

export const XBOX_BASE_URL =
  useDevProxy || import.meta.env.VITE_USE_XBOX_PROXY === 'true'
    ? '/api/xbox'
    : 'https://storeedgefd.dsx.mp.microsoft.com'

/** categoryGridRetrieve persisted query hash (PS Store APQ) */
export const PS_CATEGORY_GRID_HASH =
  '9845afc0dbaab4965f6563fffc703f588c8e76792000e8610843b8d3ee9c4c09'

/**
 * 환율 API 실패 시 사용할 폴백 값.
 * 필요하면 `.env`의 VITE_USD_KRW_RATE로 덮어쓰세요.
 */
export const FALLBACK_USD_KRW_RATE = Number(import.meta.env.VITE_USD_KRW_RATE ?? 1350)

/** Steam 스토어 ID (CheapShark) */
export const STEAM_STORE_ID = '1'

/** Epic Games Store ID (CheapShark) */
export const EPIC_STORE_ID = '25'

/** CheapShark 한 페이지 요청 크기 (최대 60) */
export const CHEAPSHARK_PAGE_SIZE = 60

/** 플랫폼별 최대 할인 게임 개수 */
export const DEAL_LIMIT = 150

/**
 * 할인율 상위 몇 개까지를 "상위 노출 후보 풀"로 볼지.
 * 이 풀 안에서만 순서를 무작위로 섞어서, 매번 같은 게임만 맨 위에 나오지 않게 해요.
 */
export const TOP_DEAL_POOL_SIZE = 30

/** CheapShark에서 가져올 페이지 수 (pageSize 최대 60 → 3페이지 ≈ 180) */
export const CHEAPSHARK_PAGES = 3

/** 화면에 처음 보여줄 게임 수 / 더보기 단위 */
export const DEAL_PAGE_SIZE = 10

/** 인기 게임 필터: 최소 리뷰 수 */
export const MIN_STEAM_REVIEW_COUNT = 1000

/** 인기 게임 필터: 최소 긍정 평가 비율(%) */
export const MIN_STEAM_RATING_PERCENT = 70

/** 인기 게임 필터: 최소 할인율(%) */
export const MIN_DISCOUNT_PERCENT = 20

/** PlayStation Store "All deals" 카테고리 ID (US) */
export const PS_ALL_DEALS_CATEGORY_ID = '3f772501-f6f8-49b7-abac-874a88ca4897'
