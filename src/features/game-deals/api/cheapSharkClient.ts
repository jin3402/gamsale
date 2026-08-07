import {
  CHEAPSHARK_PAGE_SIZE,
  CHEAPSHARK_PAGES,
  DEAL_LIMIT,
  MIN_DISCOUNT_PERCENT,
  MIN_STEAM_RATING_PERCENT,
  MIN_STEAM_REVIEW_COUNT,
  STEAM_STORE_ID,
} from './config'
import { cheapSharkJson, GameDealApiError } from './cheapSharkRequest'
import type { CheapSharkDeal } from './cheapSharkTypes'

export { GameDealApiError }

async function fetchSteamDealPage(pageNumber: number): Promise<CheapSharkDeal[]> {
  const params = new URLSearchParams({
    storeID: STEAM_STORE_ID,
    pageSize: String(CHEAPSHARK_PAGE_SIZE),
    pageNumber: String(pageNumber),
    onSale: '1',
    sortBy: 'Reviews',
  })

  return cheapSharkJson<CheapSharkDeal[]>(`/deals?${params.toString()}`)
}

async function fetchSteamDealPages(): Promise<CheapSharkDeal[]> {
  const pages = await Promise.all(
    Array.from({ length: CHEAPSHARK_PAGES }, (_, index) => fetchSteamDealPage(index)),
  )
  return pages.flat()
}

function isPopularHighDiscount(deal: CheapSharkDeal, reviewFloor: number, discountFloor: number) {
  if (deal.isOnSale !== '1' || !deal.steamAppID) return false

  const reviewCount = Number(deal.steamRatingCount ?? 0)
  const ratingPercent = Number(deal.steamRatingPercent ?? 0)
  const savings = Number(deal.savings ?? 0)

  return (
    reviewCount >= reviewFloor &&
    ratingPercent >= MIN_STEAM_RATING_PERCENT &&
    savings >= discountFloor
  )
}

function dedupeBySteamAppId(deals: CheapSharkDeal[]) {
  const seen = new Set<string>()
  const unique: CheapSharkDeal[] = []

  for (const deal of deals) {
    const appId = deal.steamAppID
    if (!appId || seen.has(appId)) continue
    seen.add(appId)
    unique.push(deal)
  }

  return unique
}

function rankByDiscount(deals: CheapSharkDeal[]) {
  return [...deals].sort((a, b) => {
    const savingsDiff = Number(b.savings) - Number(a.savings)
    if (savingsDiff !== 0) return savingsDiff
    return Number(b.steamRatingCount ?? 0) - Number(a.steamRatingCount ?? 0)
  })
}

/**
 * '더보기'로 초기 목록(CHEAPSHARK_PAGES 만큼 미리 받아둔 분량)을 다 본 뒤에만 호출돼요.
 * 페이지를 한 장씩 실시간으로 더 가져와서, 처음부터 전부 미리 연동해두지 않아도 되게 해요.
 */
export async function fetchMoreSteamDeals(
  pageNumber: number,
  excludeTitles: ReadonlySet<string>,
): Promise<CheapSharkDeal[]> {
  const raw = await fetchSteamDealPage(pageNumber)
  const filtered = raw.filter(
    (deal) =>
      isPopularHighDiscount(deal, 300, 10) &&
      !!deal.steamAppID &&
      !excludeTitles.has(deal.title.trim().toLowerCase()),
  )
  return rankByDiscount(dedupeBySteamAppId(filtered))
}

/** Steam 인기 할인 — CheapShark 최대 CHEAPSHARK_PAGES 페이지. */
export async function fetchPopularSteamDeals(): Promise<CheapSharkDeal[]> {
  const pooled = await fetchSteamDealPages()

  const strict = dedupeBySteamAppId(
    pooled.filter((deal) =>
      isPopularHighDiscount(deal, MIN_STEAM_REVIEW_COUNT, MIN_DISCOUNT_PERCENT),
    ),
  )

  let selected = rankByDiscount(strict).slice(0, DEAL_LIMIT)

  if (selected.length < DEAL_LIMIT) {
    const relaxed = dedupeBySteamAppId(
      pooled.filter((deal) => isPopularHighDiscount(deal, 500, 15)),
    )
    selected = rankByDiscount(relaxed).slice(0, DEAL_LIMIT)
  }

  if (selected.length < Math.min(10, DEAL_LIMIT)) {
    const fallback = dedupeBySteamAppId(
      pooled.filter((deal) => {
        if (deal.isOnSale !== '1' || !deal.steamAppID) return false
        return Number(deal.steamRatingCount ?? 0) >= 200 && Number(deal.savings ?? 0) >= 15
      }),
    )
    selected = rankByDiscount(fallback).slice(0, DEAL_LIMIT)
  }

  return selected
}
