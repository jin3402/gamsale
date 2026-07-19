import {
  CHEAPSHARK_PAGE_SIZE,
  MIN_DISCOUNT_PERCENT,
  MIN_STEAM_RATING_PERCENT,
  MIN_STEAM_REVIEW_COUNT,
  STEAM_DEAL_LIMIT,
  STEAM_STORE_ID,
} from './config'
import { cheapSharkJson, GameDealApiError } from './cheapSharkRequest'
import type { CheapSharkDeal } from './cheapSharkTypes'
import type { SortOption } from '../types'

export { GameDealApiError }

async function fetchSteamDealPage(): Promise<CheapSharkDeal[]> {
  const params = new URLSearchParams({
    storeID: STEAM_STORE_ID,
    // 한 번 호출로 충분히 모으기
    pageSize: String(CHEAPSHARK_PAGE_SIZE),
    pageNumber: '0',
    onSale: '1',
    sortBy: 'Reviews',
  })

  return cheapSharkJson<CheapSharkDeal[]>(`/deals?${params.toString()}`)
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

function rankPopularDeals(deals: CheapSharkDeal[], sort: SortOption) {
  return [...deals].sort((a, b) => {
    const savingsDiff = Number(b.savings) - Number(a.savings)
    const reviewDiff = Number(b.steamRatingCount ?? 0) - Number(a.steamRatingCount ?? 0)

    if (sort === 'historicalLow') {
      // 추가 API 없이 dealRating으로 정렬 (역대 최저가 배지는 붙이지 않음)
      const ratingDiff = Number(b.dealRating ?? 0) - Number(a.dealRating ?? 0)
      if (ratingDiff !== 0) return ratingDiff
      if (savingsDiff !== 0) return savingsDiff
      return reviewDiff
    }

    if (savingsDiff !== 0) return savingsDiff
    return reviewDiff
  })
}

/**
 * Steam 인기 할인 — CheapShark 요청 1회만.
 */
export async function fetchPopularSteamDeals(sort: SortOption): Promise<CheapSharkDeal[]> {
  const pooled = await fetchSteamDealPage()

  const strict = dedupeBySteamAppId(
    pooled.filter((deal) =>
      isPopularHighDiscount(deal, MIN_STEAM_REVIEW_COUNT, MIN_DISCOUNT_PERCENT),
    ),
  )

  let selected = rankPopularDeals(strict, sort).slice(0, STEAM_DEAL_LIMIT)

  if (selected.length < STEAM_DEAL_LIMIT) {
    const relaxed = dedupeBySteamAppId(
      pooled.filter((deal) => isPopularHighDiscount(deal, 500, 15)),
    )
    selected = rankPopularDeals(relaxed, sort).slice(0, STEAM_DEAL_LIMIT)
  }

  if (selected.length < Math.min(10, STEAM_DEAL_LIMIT)) {
    const fallback = dedupeBySteamAppId(
      pooled.filter((deal) => {
        if (deal.isOnSale !== '1' || !deal.steamAppID) return false
        return Number(deal.steamRatingCount ?? 0) >= 200 && Number(deal.savings ?? 0) >= 15
      }),
    )
    selected = rankPopularDeals(fallback, sort).slice(0, STEAM_DEAL_LIMIT)
  }

  return selected
}
