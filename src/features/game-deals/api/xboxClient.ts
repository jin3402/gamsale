import type { GameDeal } from '../types'
import { DEAL_LIMIT, XBOX_BASE_URL } from './config'
import { canFetchXboxLive, getXboxSnapshotDeals } from './consoleSnapshots'
import { discountPercent, parseMoneyAmount, toKrw } from './money'

interface XboxImage {
  ImageType?: string
  Url?: string
}

interface XboxSalePrice {
  Price?: number
  BadgeId?: string
}

interface XboxSkuSummary {
  MSRP?: number
  SalePrices?: XboxSalePrice[]
}

interface XboxProductLike {
  Title?: string
  ProductId?: string
  Price?: number
  StrikethroughPrice?: string
  RatingsCount?: string | number
  Images?: XboxImage[]
  SkusSummary?: XboxSkuSummary[]
}

/** 장르 + 타이틀 검색으로 할인 목록을 넓게 모아요. */
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
  'action',
  'rpg',
  'racing',
  'horror',
  'indie',
  'deal',
  'sale',
]

const XBOX_MIN_DISCOUNT_PERCENT = 10

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
    images.find((image) => /poster/i.test(image.ImageType ?? '')) ||
    images.find((image) => /boxart|hero|superhero/i.test(image.ImageType ?? '')) ||
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

/**
 * Xbox 카드는 Game Pass 때문에 Price=0인 경우가 많아,
 * SkusSummary의 MSRP / SalePrices로 실제 유료 할인을 읽어요.
 */
function resolvePaidPrices(product: XboxProductLike): {
  title: string
  originalUsd: number
  saleUsd: number
} | null {
  const productId = product.ProductId
  const title = product.Title?.trim()
  if (!productId || !title) return null

  for (const sku of product.SkusSummary ?? []) {
    const msrp = sku.MSRP
    if (typeof msrp !== 'number' || msrp <= 0) continue

    let sale: number | null = null
    for (const salePrice of sku.SalePrices ?? []) {
      if (
        typeof salePrice.Price === 'number' &&
        salePrice.Price > 0 &&
        (salePrice.BadgeId == null || salePrice.BadgeId === 'default')
      ) {
        sale = salePrice.Price
        break
      }
    }

    if (sale == null && typeof product.Price === 'number' && product.Price > 0) {
      sale = product.Price
    }

    if (sale != null && sale > 0 && sale < msrp) {
      return { title, originalUsd: msrp, saleUsd: sale }
    }
  }

  const saleUsd = product.Price
  const strike = product.StrikethroughPrice?.replace(/\u200b/g, '').trim()
  const originalUsd = parseMoneyAmount(strike)
  if (
    typeof saleUsd === 'number' &&
    saleUsd > 0 &&
    originalUsd != null &&
    saleUsd < originalUsd
  ) {
    return { title, originalUsd, saleUsd }
  }

  return null
}

function mapXboxProduct(
  product: XboxProductLike,
  usdKrwRate: number,
): (GameDeal & { reviewScore: number }) | null {
  const productId = product.ProductId
  const priced = resolvePaidPrices(product)
  if (!productId || !priced) return null
  if (/(Netflix|YouTube|Spotify|Disney|Hulu|Prime Video)/i.test(priced.title)) return null

  const { title, originalUsd, saleUsd } = priced
  const rate = discountPercent(originalUsd, saleUsd)
  if (rate < XBOX_MIN_DISCOUNT_PERCENT) return null

  const thumbnailUrl = pickThumbnail(product.Images)
  if (!thumbnailUrl) return null

  return {
    id: `xbox-${productId}`,
    title,
    platform: 'Xbox',
    thumbnailUrl,
    endsAt: undefined,
    originalPrice: toKrw(originalUsd, usdKrwRate),
    salePrice: toKrw(saleUsd, usdKrwRate),
    discountRate: rate,
    dealUrl: `https://www.xbox.com/en-US/games/store/a/${productId}`,
    reviewScore: parseRatingsCount(product.RatingsCount),
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

async function fetchXboxDealsLive(usdKrwRate: number): Promise<GameDeal[]> {
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
    if (b.discountRate !== a.discountRate) return b.discountRate - a.discountRate
    return b.reviewScore - a.reviewScore
  })

  return deals.slice(0, DEAL_LIMIT).map(({ reviewScore: _reviewScore, ...deal }) => deal)
}

/**
 * Xbox 할인 목록.
 * 토스 WebView는 CORS로 Microsoft Store 직접 호출이 막혀 빌드 스냅샷을 사용해요.
 */
export async function fetchXboxDeals(usdKrwRate: number): Promise<GameDeal[]> {
  if (!canFetchXboxLive()) {
    return getXboxSnapshotDeals()
  }

  try {
    const live = await fetchXboxDealsLive(usdKrwRate)
    if (live.length > 0) return live
  } catch (error) {
    console.warn('[xbox] live fetch failed, using snapshot', error)
  }

  return getXboxSnapshotDeals()
}
