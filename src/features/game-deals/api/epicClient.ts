import {
  DEAL_LIMIT,
  EPIC_STORE_ID,
  MIN_DISCOUNT_PERCENT,
  MIN_STEAM_RATING_PERCENT,
  MIN_STEAM_REVIEW_COUNT,
} from './config'
import {
  fetchCheapSharkDealPage,
  fetchCheapSharkDealPages,
  rankBySavings,
  toTitleKey,
} from './cheapSharkDeals'
import type { CheapSharkDeal } from './cheapSharkTypes'

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

/**
 * '더보기'로 초기 목록을 다 본 뒤에만 호출돼요. 페이지를 한 장씩 실시간으로 더 가져와요.
 */
export async function fetchMoreEpicDeals(
  pageNumber: number,
  excludeTitles: ReadonlySet<string>,
): Promise<CheapSharkDeal[]> {
  const raw = await fetchCheapSharkDealPage(EPIC_STORE_ID, pageNumber)
  const filtered = raw.filter(
    (deal) => isPaidHighDiscount(deal, 200, 10) && !excludeTitles.has(toTitleKey(deal.title)),
  )
  return rankBySavings(dedupeByTitle(filtered))
}

/** Epic 할인 — CheapShark 최대 CHEAPSHARK_PAGES 페이지 */
export async function fetchPopularEpicDeals(): Promise<CheapSharkDeal[]> {
  const pooled = await fetchCheapSharkDealPages(EPIC_STORE_ID)

  const strict = dedupeByTitle(
    pooled.filter((deal) =>
      isPaidHighDiscount(deal, MIN_STEAM_REVIEW_COUNT, MIN_DISCOUNT_PERCENT),
    ),
  )

  let selected = rankBySavings(strict).slice(0, DEAL_LIMIT)

  if (selected.length < DEAL_LIMIT) {
    const relaxed = dedupeByTitle(
      pooled.filter((deal) => isPaidHighDiscount(deal, 300, 15)),
    )
    selected = rankBySavings(relaxed).slice(0, DEAL_LIMIT)
  }

  return selected
}
