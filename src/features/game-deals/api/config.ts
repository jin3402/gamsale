/**
 * 개발 중에는 Vite 프록시를 쓰고,
 * 빌드·토스 WebView에서는 직접 호출을 시도해요.
 * CORS가 막히면 `.env`의 VITE_USE_*_PROXY=true 와 리버스 프록시가 필요해요.
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

export const PLAYSTATION_BASE_URL =
  useDevProxy || import.meta.env.VITE_USE_PLAYSTATION_PROXY === 'true'
    ? '/api/playstation'
    : 'https://store.playstation.com'

export const XBOX_BASE_URL =
  useDevProxy || import.meta.env.VITE_USE_XBOX_PROXY === 'true'
    ? '/api/xbox'
    : 'https://storeedgefd.dsx.mp.microsoft.com'

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
export const DEAL_LIMIT = 50

/** @deprecated DEAL_LIMIT 사용 */
export const STEAM_DEAL_LIMIT = DEAL_LIMIT

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
