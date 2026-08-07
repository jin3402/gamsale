import type { GameDeal } from '../types'
import {
  DEAL_LIMIT,
  MIN_DISCOUNT_PERCENT,
  PLAYSTATION_GRAPHQL_BASE_URL,
  PS_ALL_DEALS_CATEGORY_ID,
  PS_CATEGORY_GRID_HASH,
} from './config'
import { canFetchPlayStationLive, getPlayStationSnapshotDeals } from './consoleSnapshots'
import { discountPercent, parseMoneyAmount, toKrw } from './money'

interface PsMedia {
  type?: string
  url?: string
  role?: string
}

interface PsPrice {
  basePrice?: string
  discountedPrice?: string
  discountText?: string | null
  endTime?: string | null
  isFree?: boolean
}

interface PsProduct {
  id?: string
  name?: string
  price?: PsPrice
  media?: PsMedia[]
  storeDisplayClassification?: string
  localizedStoreDisplayClassification?: string
}

const PAGE_SIZE = 24
/** 24 × 7 ≈ 168개 확보 후 DEAL_LIMIT(150)로 자름 */
const PAGES_TO_FETCH = [0, 1, 2, 3, 4, 5, 6]

function pickThumbnail(media?: PsMedia[]) {
  if (!media?.length) return ''

  const images = media.filter((item) => item.type === 'IMAGE' && item.url)
  const preferred =
    images.find((item) => item.role === 'MASTER') ||
    images.find((item) => item.role?.includes('KEY_ART')) ||
    images.find((item) => item.role === 'GAMEHUB_COVER_ART') ||
    images.find((item) => item.role?.includes('EDITION')) ||
    images.find((item) => item.role === 'LOGO') ||
    images[0]

  return preferred?.url ?? ''
}

function isAddonOrCurrency(name: string, classification?: string) {
  const haystack = `${name} ${classification ?? ''}`
  return /(Cash Card|Season Pass|Add-On|Avatar|Theme|Currency|Points|Promotion for PlayStation)/i.test(
    haystack,
  )
}

function mapPsProduct(product: PsProduct, usdKrwRate: number): GameDeal | null {
  const title = product.name?.trim()
  const id = product.id
  if (!title || !id) return null

  const classification =
    product.storeDisplayClassification || product.localizedStoreDisplayClassification
  if (isAddonOrCurrency(title, classification)) return null

  const originalUsd = parseMoneyAmount(product.price?.basePrice)
  const saleUsd = parseMoneyAmount(product.price?.discountedPrice)
  if (originalUsd == null || saleUsd == null || saleUsd <= 0) return null
  if (product.price?.isFree) return null

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
    dealUrl: `https://store.playstation.com/en-us/product/${id}`,
  }
}

async function fetchPsDealPage(offset: number): Promise<PsProduct[]> {
  const variables = {
    id: PS_ALL_DEALS_CATEGORY_ID,
    pageArgs: { size: PAGE_SIZE, offset },
  }
  const extensions = {
    persistedQuery: {
      version: 1,
      sha256Hash: PS_CATEGORY_GRID_HASH,
    },
  }

  const params = new URLSearchParams({
    operationName: 'categoryGridRetrieve',
    variables: JSON.stringify(variables),
    extensions: JSON.stringify(extensions),
  })

  const response = await fetch(`${PLAYSTATION_GRAPHQL_BASE_URL}/api/graphql/v1/op?${params}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-apollo-operation-name': 'categoryGridRetrieve',
      'X-PSN-Store-Locale-Override': 'en-US',
    },
  })

  if (!response.ok) {
    throw new Error(`PlayStation 할인 정보를 불러오지 못했어요. (${response.status})`)
  }

  const payload = (await response.json()) as {
    data?: { categoryGridRetrieve?: { products?: PsProduct[] } }
    errors?: Array<{ message?: string }>
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message || 'PlayStation GraphQL 오류')
  }

  return payload.data?.categoryGridRetrieve?.products ?? []
}

async function fetchPlayStationDealsLive(usdKrwRate: number): Promise<GameDeal[]> {
  const pages = await Promise.all(
    PAGES_TO_FETCH.map((page) => fetchPsDealPage(page * PAGE_SIZE)),
  )
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
  deals.sort((a, b) => b.discountRate - a.discountRate)

  return deals.slice(0, DEAL_LIMIT)
}

/**
 * PlayStation Store All Deals 카테고리에서 할인을 가져와요.
 * 토스 WebView는 CORS로 GraphQL 직접 호출이 막혀 빌드 스냅샷을 사용해요.
 */
export async function fetchPlayStationDeals(usdKrwRate: number): Promise<GameDeal[]> {
  if (!canFetchPlayStationLive()) {
    return getPlayStationSnapshotDeals()
  }

  try {
    const live = await fetchPlayStationDealsLive(usdKrwRate)
    if (live.length > 0) return live
  } catch (error) {
    console.warn('[playstation] live fetch failed, using snapshot', error)
  }

  return getPlayStationSnapshotDeals()
}
