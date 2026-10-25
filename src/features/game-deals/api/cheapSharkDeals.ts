import { CHEAPSHARK_PAGE_SIZE, CHEAPSHARK_PAGES } from './config'
import { cheapSharkJson } from './cheapSharkRequest'
import type { CheapSharkDeal } from './cheapSharkTypes'

/** CheapShark `/deals`에서 특정 스토어(Steam·Epic)의 할인 목록 한 페이지를 가져와요. */
export function fetchCheapSharkDealPage(storeId: string, pageNumber: number): Promise<CheapSharkDeal[]> {
  const params = new URLSearchParams({
    storeID: storeId,
    pageSize: String(CHEAPSHARK_PAGE_SIZE),
    pageNumber: String(pageNumber),
    onSale: '1',
    sortBy: 'Reviews',
  })

  return cheapSharkJson<CheapSharkDeal[]>(`/deals?${params.toString()}`)
}

/** 첫 로드용으로 0 ~ CHEAPSHARK_PAGES-1 페이지를 모아요. */
export async function fetchCheapSharkDealPages(storeId: string): Promise<CheapSharkDeal[]> {
  const pages = await Promise.all(
    Array.from({ length: CHEAPSHARK_PAGES }, (_, index) => fetchCheapSharkDealPage(storeId, index)),
  )
  return pages.flat()
}

/** 할인율 높은 순, 같으면 리뷰 수 많은 순이에요. */
export function rankBySavings(deals: CheapSharkDeal[]) {
  return [...deals].sort((a, b) => {
    const savingsDiff = Number(b.savings) - Number(a.savings)
    if (savingsDiff !== 0) return savingsDiff
    return Number(b.steamRatingCount ?? 0) - Number(a.steamRatingCount ?? 0)
  })
}

/** 이미 화면에 있는 제목인지 비교할 때 쓰는 키예요. */
export function toTitleKey(title: string) {
  return title.trim().toLowerCase()
}
