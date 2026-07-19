import type { SortOption } from '../types'
import {
  CHEAPSHARK_PAGE_SIZE,
  DEAL_LIMIT,
  EPIC_STORE_ID,
  MIN_DISCOUNT_PERCENT,
  MIN_STEAM_RATING_PERCENT,
  MIN_STEAM_REVIEW_COUNT,
} from './config'
import type { CheapSharkDeal } from './cheapSharkTypes'
import { cheapSharkJson } from './cheapSharkRequest'

async function fetchEpicDealPage(): Promise<CheapSharkDeal[]> {
  const params = new URLSearchParams({
    storeID: EPIC_STORE_ID,
    pageSize: String(CHEAPSHARK_PAGE_SIZE),
    pageNumber: '0',
    onSale: '1',
    sortBy: 'Reviews',
  })

  return cheapSharkJson<CheapSharkDeal[]>(`/deals?${params.toString()}`)
}

function isPaidHighDiscount(deal: CheapSharkDeal, reviewFloor: number, discountFloor: number) {
  if (deal.isOnSale !== '1') return false

  const salePrice = Number(deal.salePrice)
  const reviewCount = Number(deal.steamRatingCount ?? 0)
  const ratingPercent = Number(deal.steamRatingPercent ?? 0)
  const savings = Number(deal.savings ?? 0)

  if (!Number.isFinite(salePrice) || salePrice <= 0) return false

  return (
    reviewCount >= reviewFloor &&
    (ratingPercent === 0 || ratingPercent >= MIN_STEAM_RATING_PERCENT - 10) &&
    savings >= discountFloor
  )
}

function dedupeByTitle(deals: CheapSharkDeal[]) {
  const seen = new Set<string>()
  const unique: CheapSharkDeal[] = []

  for (const deal of deals) {
    const key = deal.steamAppID || deal.title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(deal)
  }

  return unique
}

function rankDeals(deals: CheapSharkDeal[], sort: SortOption) {
  return [...deals].sort((a, b) => {
    const savingsDiff = Number(b.savings) - Number(a.savings)
    const reviewDiff = Number(b.steamRatingCount ?? 0) - Number(a.steamRatingCount ?? 0)

    if (sort === 'historicalLow') {
      const ratingDiff = Number(b.dealRating ?? 0) - Number(a.dealRating ?? 0)
      if (ratingDiff !== 0) return ratingDiff
      if (savingsDiff !== 0) return savingsDiff
      return reviewDiff
    }

    if (savingsDiff !== 0) return savingsDiff
    return reviewDiff
  })
}

/** Epic 할인 — CheapShark 요청 1회만 */
export async function fetchPopularEpicDeals(sort: SortOption): Promise<CheapSharkDeal[]> {
  const pooled = await fetchEpicDealPage()

  const strict = dedupeByTitle(
    pooled.filter((deal) =>
      isPaidHighDiscount(deal, MIN_STEAM_REVIEW_COUNT, MIN_DISCOUNT_PERCENT),
    ),
  )

  let selected = rankDeals(strict, sort).slice(0, DEAL_LIMIT)

  if (selected.length < DEAL_LIMIT) {
    const relaxed = dedupeByTitle(
      pooled.filter((deal) => isPaidHighDiscount(deal, 300, 15)),
    )
    selected = rankDeals(relaxed, sort).slice(0, DEAL_LIMIT)
  }

  return selected
}
