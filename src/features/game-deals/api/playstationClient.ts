import type { GameDeal, SortOption } from '../types'
import {
  DEAL_LIMIT,
  MIN_DISCOUNT_PERCENT,
  PLAYSTATION_BASE_URL,
  PS_ALL_DEALS_CATEGORY_ID,
} from './config'
import { discountPercent, parseMoneyAmount, toKrw } from './money'

interface PsMedia {
  type?: string
  url?: string
  role?: string
}

interface PsPrice {
  basePrice?: string
  discountedPrice?: string
  endTime?: string | null
}

interface PsProduct {
  id?: string
  name?: string
  price?: PsPrice
  media?: PsMedia[]
  storeDisplayClassification?: string
}

const PAGES_TO_FETCH = [1, 2, 3, 4]

function extractNextData(html: string): unknown {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/,
  )
  if (!match?.[1]) {
    throw new Error('PlayStation 스토어 응답을 해석하지 못했어요.')
  }
  return JSON.parse(match[1]) as unknown
}

function collectProducts(node: unknown, out: PsProduct[]) {
  if (!node || typeof node !== 'object') return

  if (Array.isArray(node)) {
    for (const child of node) collectProducts(child, out)
    return
  }

  const obj = node as Record<string, unknown>
  const name = obj.name
  const price = obj.price
  const id = obj.id

  if (
    typeof name === 'string' &&
    typeof id === 'string' &&
    price &&
    typeof price === 'object'
  ) {
    out.push(obj as PsProduct)
  }

  for (const value of Object.values(obj)) {
    collectProducts(value, out)
  }
}

function pickThumbnail(media?: PsMedia[]) {
  if (!media?.length) return ''

  const images = media.filter((item) => item.type === 'IMAGE' && item.url)
  const preferred =
    images.find((item) => item.role === 'MASTER') ||
    images.find((item) => item.role?.includes('KEY_ART')) ||
    images.find((item) => item.role?.includes('EDITION')) ||
    images[0]

  return preferred?.url ?? ''
}

function isAddonOrCurrency(name: string, classification?: string) {
  const haystack = `${name} ${classification ?? ''}`
  return /(Cash Card|Season Pass|Add-On|Avatar|Theme|Currency|Points)/i.test(haystack)
}

function mapPsProduct(product: PsProduct, usdKrwRate: number): GameDeal | null {
  const title = product.name?.trim()
  const id = product.id
  if (!title || !id) return null
  if (isAddonOrCurrency(title, product.storeDisplayClassification)) return null

  const originalUsd = parseMoneyAmount(product.price?.basePrice)
  const saleUsd = parseMoneyAmount(product.price?.discountedPrice)
  if (originalUsd == null || saleUsd == null) return null

  const rate = discountPercent(originalUsd, saleUsd)
  if (rate < MIN_DISCOUNT_PERCENT) return null

  const thumbnailUrl = pickThumbnail(product.media)
  if (!thumbnailUrl) return null

  const endsAt =
    typeof product.price?.endTime === 'string' && product.price.endTime
      ? product.price.endTime
      : undefined

  return {
    id: `ps-${id}`,
    title,
    platform: 'PlayStation',
    thumbnailUrl,
    endsAt,
    originalPrice: toKrw(originalUsd, usdKrwRate),
    salePrice: toKrw(saleUsd, usdKrwRate),
    discountRate: rate,
    // PS Store API에는 역대 최저가 이력이 없어 표시하지 않아요.
    isHistoricalLow: false,
    dealUrl: `https://store.playstation.com/en-us/product/${id}`,
  }
}

async function fetchPsDealPage(page: number): Promise<PsProduct[]> {
  const response = await fetch(
    `${PLAYSTATION_BASE_URL}/en-us/category/${PS_ALL_DEALS_CATEGORY_ID}/${page}`,
    {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`PlayStation 할인 정보를 불러오지 못했어요. (${response.status})`)
  }

  const html = await response.text()
  const nextData = extractNextData(html)
  const products: PsProduct[] = []
  collectProducts(nextData, products)
  return products
}

/**
 * PlayStation Store(US) All Deals 카테고리에서 실시간 할인을 가져와요.
 */
export async function fetchPlayStationDeals(
  sort: SortOption,
  usdKrwRate: number,
): Promise<GameDeal[]> {
  const pages = await Promise.all(PAGES_TO_FETCH.map((page) => fetchPsDealPage(page)))
  const byId = new Map<string, GameDeal>()

  for (const product of pages.flat()) {
    const deal = mapPsProduct(product, usdKrwRate)
    if (!deal) continue
    const prev = byId.get(deal.id)
    if (!prev || deal.discountRate > prev.discountRate) {
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
    return b.discountRate - a.discountRate
  })

  return deals.slice(0, DEAL_LIMIT)
}
