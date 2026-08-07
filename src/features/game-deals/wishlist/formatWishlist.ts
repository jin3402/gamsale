import { resolveStoreUrl } from '../api/storeUrl'
import type { GameDeal } from '../types'

function formatPrice(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

/** 게임 1개를 나타내는 공유용 텍스트 한 덩어리 — 위시리스트 공유와 개별 공유가 같은 형식을 써요. */
function formatDealLine(deal: GameDeal) {
  const link = `\n   ${resolveStoreUrl(deal)}`
  return `[${deal.platform}] ${deal.title}\n   -${deal.discountRate}% · ${formatPrice(deal.salePrice)} (정가 ${formatPrice(deal.originalPrice)})${link}`
}

/** 공유용 텍스트 — 링크는 플랫폼 스토어(상품/검색)로 연결해요. */
export function formatWishlistText(deals: GameDeal[]) {
  if (deals.length === 0) return '위시리스트가 비어 있어요.'

  const lines = deals.map((deal, index) => `${index + 1}. ${formatDealLine(deal)}`)

  return [`할인 게임 위시리스트 (${deals.length}개)`, '', ...lines].join('\n')
}

/** 게임 하나를 공유할 때 쓰는 텍스트예요. 위시리스트 공유와 같은 형식을 따라 문구를 통일했어요. */
export function formatDealShareText(deal: GameDeal) {
  return ['겜세일에서 발견한 할인 게임', '', formatDealLine(deal)].join('\n')
}
