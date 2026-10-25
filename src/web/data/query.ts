import { PLATFORMS, platformKeyOf, type PlatformKey, type WebDeal } from './types'

export type SortKey = 'recommended' | 'discount' | 'price' | 'savings' | 'rating' | 'newest' | 'title'

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: '추천순' },
  { key: 'discount', label: '할인율 높은 순' },
  { key: 'price', label: '가격 낮은 순' },
  { key: 'savings', label: '할인 금액 큰 순' },
  { key: 'rating', label: '스팀 평점 순' },
  { key: 'newest', label: '최신 출시 순' },
  { key: 'title', label: '이름 순' },
]

export const DISCOUNT_OPTIONS = [0, 30, 50, 75, 90]

/** null = 제한 없음, 0 = 무료만 */
export const PRICE_OPTIONS: (number | null)[] = [null, 0, 5000, 10000, 20000, 30000, 50000]

export interface DealQuery {
  q: string
  platforms: PlatformKey[]
  minDiscount: number
  maxPrice: number | null
  sort: SortKey
  /** 검색할 때 정가 게임까지 보여줄지 */
  includeFullPrice: boolean
}

export const DEFAULT_QUERY: DealQuery = {
  q: '',
  platforms: [],
  minDiscount: 0,
  maxPrice: null,
  sort: 'recommended',
  includeFullPrice: false,
}

const PLATFORM_KEYS = new Set<string>(PLATFORMS.map((info) => info.key))
const SORT_KEYS = new Set<string>(SORT_OPTIONS.map((option) => option.key))

/** 주소창(?q=...&p=steam,ps...)에서 검색 조건을 읽어요. 공유·뒤로가기를 위해 URL에 상태를 둬요. */
export function parseQuery(search: string): DealQuery {
  const params = new URLSearchParams(search)
  const minDiscount = Number(params.get('d') ?? 0)
  const maxPriceRaw = params.get('m')
  const maxPrice = maxPriceRaw === null || maxPriceRaw === '' ? null : Number(maxPriceRaw)
  const sort = params.get('s') ?? 'recommended'

  return {
    q: (params.get('q') ?? '').slice(0, 80),
    platforms: (params.get('p') ?? '')
      .split(',')
      .filter((key): key is PlatformKey => PLATFORM_KEYS.has(key)),
    minDiscount: DISCOUNT_OPTIONS.includes(minDiscount) ? minDiscount : 0,
    maxPrice: maxPrice !== null && PRICE_OPTIONS.includes(maxPrice) ? maxPrice : null,
    sort: SORT_KEYS.has(sort) ? (sort as SortKey) : 'recommended',
    includeFullPrice: params.get('all') === '1',
  }
}

export function serializeQuery(query: DealQuery, extra: Record<string, string | null> = {}): string {
  const params = new URLSearchParams()
  if (query.q.trim()) params.set('q', query.q.trim())
  if (query.platforms.length > 0) params.set('p', query.platforms.join(','))
  if (query.minDiscount > 0) params.set('d', String(query.minDiscount))
  if (query.maxPrice !== null) params.set('m', String(query.maxPrice))
  if (query.sort !== 'recommended') params.set('s', query.sort)
  if (query.includeFullPrice) params.set('all', '1')
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value)
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

export function isFiltered(query: DealQuery) {
  return (
    query.platforms.length > 0 ||
    query.minDiscount > 0 ||
    query.maxPrice !== null ||
    query.sort !== 'recommended' ||
    query.includeFullPrice
  )
}

/** 대소문자·기호·공백 차이를 없앤 비교용 제목 */
export function normalizeTitle(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * 검색어와 제목이 얼마나 맞는지 점수를 매겨요. 0이면 결과에서 빠져요.
 * CheapShark 검색은 느슨해서(예: "hades" → "Shades") 화면에서 한 번 더 걸러요.
 */
export function relevance(title: string, query: string): number {
  const q = normalizeTitle(query)
  if (!q) return 1
  const t = normalizeTitle(title)
  if (t === q) return 100
  if (t.startsWith(`${q} `) || t.startsWith(q)) return 80
  if (new RegExp(`(^| )${escapeRegExp(q)}( |$)`).test(t)) return 70
  // 단어 중간에 걸리는 건 빼요. ("hades"가 "Shades"에 걸리지 않게)
  // 대신 띄어쓰기는 무시해요. ("deeprock" → "Deep Rock Galactic")
  const words = t.split(' ')
  const compactQ = q.replace(/ /g, '')
  for (let i = 0; i < words.length; i += 1) {
    if (words.slice(i).join('').startsWith(compactQ)) return 55
  }
  // 한글은 붙여 쓴 복합어가 많아서 단어 안쪽까지 찾아요. ("레이싱" → "스트리트레이싱")
  if (HANGUL.test(q) && t.replace(/ /g, '').includes(compactQ)) return 50
  const tokens = q.split(' ').filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => words.some((word) => word.startsWith(token)))) return 40
  return 0
}

const HANGUL = /[가-힣]/

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 할인율과 스팀 평가를 섞은 추천 점수. 콘솔 게임은 평점이 없어 할인율만 봐요. */
function recommendScore(deal: WebDeal) {
  let score = deal.discountRate
  if (deal.steamRatingPercent) {
    score += (deal.steamRatingPercent - 75) * 0.4
    score += Math.log10((deal.steamRatingCount ?? 0) + 1) * 2.5
  }
  return score
}

function savingsOf(deal: WebDeal) {
  return Math.max(0, deal.originalPrice - deal.salePrice)
}

function compareMissingLast(a: number | undefined, b: number | undefined) {
  if (a === undefined && b === undefined) return 0
  if (a === undefined) return 1
  if (b === undefined) return -1
  return b - a
}

/** 플랫폼 조건만 빼고 나머지 조건으로 거른 목록 — 플랫폼 칩 옆 개수를 셀 때 써요. */
export function filterWithoutPlatform(deals: WebDeal[], query: DealQuery): WebDeal[] {
  return deals.filter((deal) => {
    if (query.q && relevance(deal.title, query.q) === 0) return false
    if (!query.includeFullPrice || !query.q) {
      if (deal.discountRate <= 0) return false
    }
    if (deal.discountRate < query.minDiscount) return false
    if (query.maxPrice !== null) {
      if (query.maxPrice === 0 ? deal.salePrice !== 0 : deal.salePrice > query.maxPrice) return false
    }
    return true
  })
}

export function applyQuery(deals: WebDeal[], query: DealQuery): WebDeal[] {
  const platformSet = new Set(query.platforms)
  const filtered = filterWithoutPlatform(deals, query).filter(
    (deal) => platformSet.size === 0 || platformSet.has(platformKeyOf(deal.platform)),
  )

  const relevanceCache = new Map<string, number>()
  const rel = (deal: WebDeal) => {
    let value = relevanceCache.get(deal.id)
    if (value === undefined) {
      value = relevance(deal.title, query.q)
      relevanceCache.set(deal.id, value)
    }
    return value
  }

  return [...filtered].sort((a, b) => {
    switch (query.sort) {
      case 'discount':
        return b.discountRate - a.discountRate || savingsOf(b) - savingsOf(a)
      case 'price':
        return a.salePrice - b.salePrice || b.discountRate - a.discountRate
      case 'savings':
        return savingsOf(b) - savingsOf(a)
      case 'rating':
        return (
          compareMissingLast(a.steamRatingPercent, b.steamRatingPercent) ||
          compareMissingLast(a.steamRatingCount, b.steamRatingCount)
        )
      case 'newest':
        return compareMissingLast(a.releaseDate, b.releaseDate)
      case 'title':
        return a.title.localeCompare(b.title, 'ko')
      case 'recommended':
        if (query.q) {
          const diff = rel(b) - rel(a)
          if (diff !== 0) return diff
        }
        return recommendScore(b) - recommendScore(a)
    }
  })
}

/** 같은 딜이 목록·검색 결과에 겹치면 하나만 남겨요. */
export function dedupeDeals(deals: WebDeal[]): WebDeal[] {
  const seen = new Set<string>()
  const result: WebDeal[] = []
  for (const deal of deals) {
    if (seen.has(deal.id)) continue
    seen.add(deal.id)
    result.push(deal)
  }
  return result
}
