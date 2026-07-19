import type { GameDeal, SortOption } from '../types'
import { DEAL_LIMIT, MIN_DISCOUNT_PERCENT, XBOX_BASE_URL } from './config'
import { discountPercent, parseMoneyAmount, toKrw } from './money'

interface XboxImage {
  ImageType?: string
  Url?: string
}

interface XboxProductLike {
  Title?: string
  ProductId?: string
  Price?: number
  StrikethroughPrice?: string
  RatingsCount?: string | number
  Images?: XboxImage[]
}

const SEARCH_QUERIES = [
  'forza',
  'halo',
  'gears',
  'starfield',
  'assassin',
  'minecraft',
  'doom',
  'resident evil',
  'witcher',
  'cyberpunk',
  'ori',
  'grounded',
  'sea of thieves',
  'hi-fi rush',
  'flight simulator',
  'red dead',
  'elden',
  'diablo',
  'call of duty',
  'tomb raider',
]

function parseRatingsCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return 0

  const normalized = value.trim().replace(/,/g, '')
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)([KkMm])?$/)
  if (!match) {
    const digits = Number(normalized.replace(/[^\d.]/g, ''))
    return Number.isFinite(digits) ? digits : 0
  }

  const base = Number(match[1])
  const suffix = match[2]?.toLowerCase()
  if (suffix === 'k') return Math.round(base * 1000)
  if (suffix === 'm') return Math.round(base * 1_000_000)
  return base
}

function pickThumbnail(images?: XboxImage[]) {
  if (!images?.length) return ''
  const preferred =
    images.find((image) => image.ImageType === 'SuperHeroArt') ||
    images.find((image) => image.ImageType === 'Hero') ||
    images.find((image) => image.ImageType === 'Poster') ||
    images.find((image) => image.ImageType === 'BoxArt') ||
    images[0]
  return preferred?.Url ?? ''
}

function walkForProducts(node: unknown, out: XboxProductLike[], depth = 0) {
  if (!node || depth > 14) return

  if (Array.isArray(node)) {
    for (const child of node.slice(0, 120)) walkForProducts(child, out, depth + 1)
    return
  }

  if (typeof node !== 'object') return

  const obj = node as XboxProductLike & Record<string, unknown>
  if (obj.Title && obj.ProductId && typeof obj.Price === 'number') {
    out.push(obj)
  }

  for (const value of Object.values(obj)) {
    walkForProducts(value, out, depth + 1)
  }
}

function resolvePaidPrices(product: XboxProductLike): {
  title: string
  originalUsd: number
  saleUsd: number
} | null {
  const productId = product.ProductId
  const title = product.Title?.trim()
  if (!productId || !title) return null

  const saleUsd = product.Price
  const originalUsd = parseMoneyAmount(product.StrikethroughPrice)

  // 무료(0원)·원가 없는 항목은 실시간 할인으로 보지 않아요.
  if (typeof saleUsd !== 'number' || saleUsd <= 0 || originalUsd == null) {
    return null
  }

  // 리뷰가 거의 없는 비인기 타이틀은 제외해요.
  const reviews = parseRatingsCount(product.RatingsCount)
  if (reviews < 200) return null

  return { title, originalUsd, saleUsd }
}

function mapXboxProduct(
  product: XboxProductLike,
  usdKrwRate: number,
): (GameDeal & { reviewScore: number }) | null {
  const productId = product.ProductId
  const priced = resolvePaidPrices(product)
  if (!productId || !priced) return null

  const { title, originalUsd, saleUsd } = priced
  const rate = discountPercent(originalUsd, saleUsd)
  if (rate < MIN_DISCOUNT_PERCENT) return null

  const thumbnailUrl = pickThumbnail(product.Images)
  if (!thumbnailUrl) return null

  const reviewScore = parseRatingsCount(product.RatingsCount)

  return {
    id: `xbox-${productId}`,
    title,
    platform: 'Xbox',
    thumbnailUrl,
    endsAt: undefined,
    originalPrice: toKrw(originalUsd, usdKrwRate),
    salePrice: toKrw(saleUsd, usdKrwRate),
    discountRate: rate,
    // Xbox Store API에는 역대 최저가 이력이 없어 표시하지 않아요.
    isHistoricalLow: false,
    dealUrl: `https://www.xbox.com/en-US/games/store/a/${productId}`,
    reviewScore,
  }
}

async function fetchXboxSearch(query: string): Promise<XboxProductLike[]> {
  const params = new URLSearchParams({
    market: 'US',
    locale: 'en-US',
    deviceFamily: 'Windows.Xbox',
    query,
  })

  const response = await fetch(
    `${XBOX_BASE_URL}/v9.0/pages/searchResults?${params.toString()}`,
  )

  if (!response.ok) {
    throw new Error(`Xbox 할인 정보를 불러오지 못했어요. (${response.status})`)
  }

  const data = (await response.json()) as unknown
  const products: XboxProductLike[] = []
  walkForProducts(data, products)
  return products
}

/**
 * Xbox/Microsoft Store 검색 결과에서 할인 중인 게임을 모아와요.
 */
export async function fetchXboxDeals(
  sort: SortOption,
  usdKrwRate: number,
): Promise<GameDeal[]> {
  const pages = await Promise.all(
    SEARCH_QUERIES.map(async (query) => {
      try {
        return await fetchXboxSearch(query)
      } catch {
        return []
      }
    }),
  )

  const byId = new Map<string, GameDeal & { reviewScore: number }>()

  for (const product of pages.flat()) {
    const deal = mapXboxProduct(product, usdKrwRate)
    if (!deal) continue

    const prev = byId.get(deal.id)
    if (
      !prev ||
      deal.discountRate > prev.discountRate ||
      (deal.discountRate === prev.discountRate && deal.reviewScore > prev.reviewScore)
    ) {
      byId.set(deal.id, deal)
    }
  }

  const deals = [...byId.values()]
  deals.sort((a, b) => {
    if (sort === 'historicalLow') {
      if (a.isHistoricalLow !== b.isHistoricalLow) {
        return a.isHistoricalLow ? -1 : 1
      }
    }
    if (b.discountRate !== a.discountRate) return b.discountRate - a.discountRate
    return b.reviewScore - a.reviewScore
  })

  return deals.slice(0, DEAL_LIMIT).map(({ reviewScore: _reviewScore, ...deal }) => deal)
}
