import { FALLBACK_USD_KRW_RATE } from './config'

const CACHE_KEY = 'fx-rate-cache-v4'
/** 1시간 캐시 — 시세 반영과 API 호출 부담을 맞춰요. */
const CACHE_TTL_MS = 60 * 60 * 1000

interface RateCache {
  usdKrw: number
  fetchedAt: number
}

interface OpenErApiResponse {
  result: string
  rates?: {
    KRW?: number
  }
}

function getExchangeBaseUrl() {
  const useProxy =
    import.meta.env.DEV || import.meta.env.VITE_USE_FX_PROXY === 'true'
  return useProxy ? '/api/fx' : 'https://open.er-api.com/v6'
}

function readCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RateCache
    if (!parsed.usdKrw || !parsed.fetchedAt) return null
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(usdKrw: number) {
  const payload: RateCache = { usdKrw, fetchedAt: Date.now() }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // 저장 실패해도 표시에는 영향 없음
  }
}

async function fetchLiveUsdKrwRate(): Promise<number> {
  const response = await fetch(`${getExchangeBaseUrl()}/latest/USD`)
  if (!response.ok) {
    throw new Error(`환율 API 오류 (${response.status})`)
  }

  const data = (await response.json()) as OpenErApiResponse
  const rate = data.rates?.KRW

  if (data.result !== 'success' || typeof rate !== 'number' || rate <= 0) {
    throw new Error('환율 응답이 올바르지 않아요.')
  }

  return Math.round(rate * 100) / 100
}

/**
 * USD→KRW 환율을 open.er-api.com에서 가져와요.
 * 1시간마다 갱신하고, 실패 시에만 폴백 환율을 써요.
 */
export async function getUsdKrwRate(): Promise<number> {
  const cached = readCache()
  if (cached) return cached.usdKrw

  try {
    const rate = await fetchLiveUsdKrwRate()
    writeCache(rate)
    return rate
  } catch {
    return FALLBACK_USD_KRW_RATE
  }
}
