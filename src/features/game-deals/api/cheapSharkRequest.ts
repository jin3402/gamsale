import { CHEAPSHARK_BASE_URL } from './config'

export class GameDealApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GameDealApiError'
    this.status = status
  }
}

const MIN_GAP_MS = 800
const CACHE_TTL_MS = 10 * 60 * 1000

let chain: Promise<void> = Promise.resolve()
let lastRequestAt = 0
const memoryCache = new Map<string, { at: number; data: unknown }>()

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function waitForGap() {
  const elapsed = Date.now() - lastRequestAt
  if (elapsed < MIN_GAP_MS) {
    await sleep(MIN_GAP_MS - elapsed)
  }
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function readSessionCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; data: T }
    if (!parsed.at || Date.now() - parsed.at > CACHE_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

function writeSessionCache(key: string, data: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // ignore quota errors
  }
}

/**
 * CheapShark JSON — 캐시 우선, 호출은 직렬화.
 * 429면 재시도하지 않고 바로 안내해요. (재시도가 차단을 더 길게 만들 수 있어요)
 */
export async function cheapSharkJson<T>(path: string): Promise<T> {
  const cacheKey = `cheapshark:${path}`

  const mem = memoryCache.get(cacheKey)
  if (mem && Date.now() - mem.at < CACHE_TTL_MS) {
    return mem.data as T
  }

  const cached = readSessionCache<T>(cacheKey)
  if (cached) {
    memoryCache.set(cacheKey, { at: Date.now(), data: cached })
    return cached
  }

  return enqueue(async () => {
    // 대기열에서 다시 한 번 캐시 확인 (앞 요청이 채웠을 수 있음)
    const again = memoryCache.get(cacheKey)
    if (again && Date.now() - again.at < CACHE_TTL_MS) {
      return again.data as T
    }

    await waitForGap()
    lastRequestAt = Date.now()

    const response = await fetch(`${CHEAPSHARK_BASE_URL}${path}`)

    if (response.status === 429) {
      throw new GameDealApiError(
        '할인 API 요청이 잠시 제한됐어요. 2~3분 뒤 다시 시도해 주세요.',
        429,
      )
    }

    if (!response.ok) {
      throw new GameDealApiError(
        `할인 정보를 불러오지 못했어요. (${response.status})`,
        response.status,
      )
    }

    const data = (await response.json()) as T | { error?: string }
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
    ) {
      throw new GameDealApiError((data as { error: string }).error, response.status)
    }

    memoryCache.set(cacheKey, { at: Date.now(), data })
    writeSessionCache(cacheKey, data)
    return data as T
  })
}
