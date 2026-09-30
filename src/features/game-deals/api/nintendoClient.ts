import type { GameDeal } from '../types'
import {
  DEAL_LIMIT,
  MIN_DISCOUNT_PERCENT,
  NINTENDO_PRICE_BASE_URL,
  NINTENDO_STORE_BASE_URL,
} from './config'
import { canFetchNintendoLive, getNintendoSnapshotDeals } from './consoleSnapshots'
import { filterSafeNintendoDeals, isBlockedNintendoTitle } from './contentFilter'
import { decodeHtmlEntities } from './contentRules.js'
import { discountPercent } from './money'

interface ParsedSaleCard {
  nsuid: string
  title: string
  originalPrice: number
  salePrice: number
  thumbnailUrl: string
  dealUrl: string
  popularity: number
}

interface PriceApiItem {
  title_id?: number
  sales_status?: string
  regular_price?: { raw_value?: string }
  discount_price?: {
    raw_value?: string
    end_datetime?: string
  }
}

interface PriceApiResponse {
  prices?: PriceApiItem[]
}

/**
 * 한국 eShop에서 자주 찾는 인기 타이틀 NSUID.
 * 할인 중일 때만 목록에 포함돼요.
 */
const POPULAR_KR_NSUIDS: Array<{ nsuid: string; title: string; popularity: number }> = [
  { nsuid: '70010000063716', title: '젤다의 전설 티어스 오브 더 킹덤', popularity: 100 },
  { nsuid: '70010000068690', title: '슈퍼 마리오브라더스 원더', popularity: 98 },
  { nsuid: '70010000027621', title: '모여봐요 동물의 숲', popularity: 96 },
  { nsuid: '70010000084610', title: '슈퍼 마리오 파티 잼버리', popularity: 94 },
  { nsuid: '70010000084605', title: '동키콩 리턴즈 HD', popularity: 92 },
  { nsuid: '70010000049933', title: 'Nintendo Switch Sports', popularity: 90 },
  { nsuid: '70010000000161', title: '슈퍼 마리오 오디세이', popularity: 88 },
  { nsuid: '70010000000025', title: '젤다의 전설 브레스 오브 더 와일드', popularity: 87 },
  { nsuid: '70010000016636', title: '루이지 맨션 3', popularity: 84 },
  { nsuid: '70010000009775', title: '슈퍼 스매시브라더스 얼티밋', popularity: 83 },
  { nsuid: '70010000031374', title: '커비 디스커버리', popularity: 80 },
  { nsuid: '70010000040334', title: '스플래툰 3', popularity: 79 },
  { nsuid: '70010000054307', title: '파이어 엠블렘 Engage', popularity: 76 },
  { nsuid: '70010000017225', title: 'XENOBLADE Chronicles 2', popularity: 74 },
  { nsuid: '70010000019411', title: '마리오 카트 8 디럭스', popularity: 95 },
  { nsuid: '70010000025154', title: '링 피트 어드벤처', popularity: 72 },
  { nsuid: '70010000020033', title: '포켓몬스터 소드', popularity: 78 },
  { nsuid: '70010000027376', title: '포켓몬스터 실드', popularity: 77 },
  { nsuid: '70010000077661', title: '페이퍼 마리오 오리건 킹', popularity: 75 },
  { nsuid: '70010000092411', title: '드래곤 퀘스트 몬스터즈', popularity: 70 },
  { nsuid: '70010000113637', title: '캡틴 츠바사 2 월드 파이터즈', popularity: 68 },
  { nsuid: '70010000116665', title: '친구모아 아일랜드 두근두근 라이프', popularity: 85 },
  { nsuid: '70010000110876', title: '테일즈 오브 이터니아 리마스터', popularity: 66 },
  { nsuid: '70010000117099', title: 'FINAL FANTASY RESONANCE', popularity: 65 },
]

function parseWon(text: string) {
  const digits = text.replace(/[^\d]/g, '')
  const value = Number(digits)
  return Number.isFinite(value) ? value : 0
}

function isPopularEnough(card: ParsedSaleCard) {
  if (isBlockedNintendoTitle(card.title)) return false
  if (card.popularity >= 60) return true
  // 베스트셀러/인기 목록에 없어도 일정 가격대 이상 할인만 허용
  return card.originalPrice >= 15000 && card.salePrice >= 1000
}

function parseSaleCards(html: string, popularityBoost = 0): ParsedSaleCard[] {
  const cards = html.match(/<li class="item product product-item"[\s\S]*?<\/li>/g) ?? []
  const parsed: ParsedSaleCard[] = []

  for (const card of cards) {
    const href = card.match(/href="(https:\/\/store\.nintendo\.co\.kr\/(7001\d{10}))"/)
    const title = card.match(/product-item-link[^>]*>\s*([^<]+)/)
    const special = card.match(/class="special-price"[\s\S]*?<span class="price">([^<]+)/)
    const old = card.match(/class="old-price"[\s\S]*?<span class="price">([^<]+)/)
    const img = card.match(/<img class="product-image-photo"[^>]*src="([^"]+)"/)

    if (!href || !title || !special || !old) continue

    const originalPrice = parseWon(old[1])
    const salePrice = parseWon(special[1])
    if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) continue

    const rate = discountPercent(originalPrice, salePrice)
    if (rate < MIN_DISCOUNT_PERCENT) continue

    parsed.push({
      nsuid: href[2],
      title: decodeHtmlEntities(title[1].trim()),
      originalPrice,
      salePrice,
      thumbnailUrl: img?.[1] ?? '',
      dealUrl: href[1],
      popularity: popularityBoost,
    })
  }

  return parsed
}

function extractNsuids(html: string) {
  return [...new Set(html.match(/7001\d{10}/g) ?? [])]
}

async function fetchStoreHtml(path: string) {
  const response = await fetch(`${NINTENDO_STORE_BASE_URL}${path}`, {
    headers: { Accept: 'text/html' },
  })
  if (!response.ok) {
    throw new Error(`한국 닌텐도 스토어를 불러오지 못했어요. (${response.status})`)
  }
  return response.text()
}

async function fetchKrPrices(nsuids: string[]): Promise<Map<string, PriceApiItem>> {
  const map = new Map<string, PriceApiItem>()
  if (nsuids.length === 0) return map

  const chunks: string[][] = []
  for (let i = 0; i < nsuids.length; i += 40) {
    chunks.push(nsuids.slice(i, i + 40))
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const response = await fetch(
        `${NINTENDO_PRICE_BASE_URL}/v1/price?country=KR&lang=ko&ids=${chunk.join(',')}`,
      )
      if (!response.ok) return [] as PriceApiItem[]
      const data = (await response.json()) as PriceApiResponse
      return data.prices ?? []
    }),
  )

  for (const price of results.flat()) {
    if (price.title_id) map.set(String(price.title_id), price)
  }
  return map
}

function mapCardToDeal(card: ParsedSaleCard, endsAt?: string): GameDeal {
  const rate = discountPercent(card.originalPrice, card.salePrice)
  return {
    id: `switch-${card.nsuid}`,
    title: card.title,
    platform: 'Nintendo Switch',
    thumbnailUrl: card.thumbnailUrl || `https://store.nintendo.co.kr/${card.nsuid}`,
    endsAt,
    originalPrice: card.originalPrice,
    salePrice: card.salePrice,
    discountRate: rate,
    dealUrl: card.dealUrl || `https://store.nintendo.co.kr/${card.nsuid}`,
  }
}

async function fetchNintendoDealsLive(): Promise<GameDeal[]> {
  const [saleHtml, bestHtml] = await Promise.all([
    fetchStoreHtml('/digital/sale'),
    fetchStoreHtml('/digital/best-sellers').catch(() => ''),
  ])

  const saleCards = parseSaleCards(saleHtml, 40)
  const bestSellerIds = new Set(extractNsuids(bestHtml))

  for (const card of saleCards) {
    if (bestSellerIds.has(card.nsuid)) card.popularity += 40
  }

  const byId = new Map<string, ParsedSaleCard>()
  for (const card of saleCards) {
    if (isBlockedNintendoTitle(card.title)) continue
    if (!isPopularEnough(card) && !bestSellerIds.has(card.nsuid)) continue
    byId.set(card.nsuid, card)
  }

  // 인기 NSUID 가격 조회로 국내 할인 여부 확인
  const popularIds = POPULAR_KR_NSUIDS.map((item) => item.nsuid)
  const priceMap = await fetchKrPrices(popularIds)

  for (const item of POPULAR_KR_NSUIDS) {
    const price = priceMap.get(item.nsuid)
    const regular = Number(price?.regular_price?.raw_value)
    const sale = Number(price?.discount_price?.raw_value)
    if (!price?.discount_price || !Number.isFinite(regular) || !Number.isFinite(sale)) continue
    if (sale <= 0 || sale >= regular) continue

    const rate = discountPercent(regular, sale)
    if (rate < MIN_DISCOUNT_PERCENT) continue

    const existing = byId.get(item.nsuid)
    byId.set(item.nsuid, {
      nsuid: item.nsuid,
      title: existing?.title || item.title,
      originalPrice: regular,
      salePrice: sale,
      thumbnailUrl: existing?.thumbnailUrl ?? '',
      dealUrl: `https://store.nintendo.co.kr/${item.nsuid}`,
      popularity: Math.max(existing?.popularity ?? 0, item.popularity),
    })
  }

  const deals = [...byId.values()]
    .filter((card) => !isBlockedNintendoTitle(card.title))
    .filter((card) => isPopularEnough(card) || bestSellerIds.has(card.nsuid))
    .map((card) => {
      const price = priceMap.get(card.nsuid)
      return mapCardToDeal(card, price?.discount_price?.end_datetime)
    })

  deals.sort((a, b) => {
    const popA = byId.get(a.id.replace('switch-', ''))?.popularity ?? 0
    const popB = byId.get(b.id.replace('switch-', ''))?.popularity ?? 0
    if (popB !== popA) return popB - popA
    return b.discountRate - a.discountRate
  })

  return filterSafeNintendoDeals(deals).slice(0, DEAL_LIMIT)
}

/**
 * 한국 닌텐도 스토어 할인만 가져와요. (일본 eShop 제외)
 * 토스 WebView는 CORS로 스토어 직접 호출이 막혀 빌드 스냅샷을 사용해요.
 */
export async function fetchNintendoDeals(): Promise<GameDeal[]> {
  if (!canFetchNintendoLive()) {
    return getNintendoSnapshotDeals()
  }

  try {
    const live = await fetchNintendoDealsLive()
    if (live.length > 0) return live
  } catch (error) {
    console.warn('[nintendo] live fetch failed, using snapshot', error)
  }

  return getNintendoSnapshotDeals()
}
