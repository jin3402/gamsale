export type Platform =
  | 'Steam'
  | 'Nintendo Switch'
  | 'PlayStation'
  | 'Xbox'
  | 'Epic Games'

export type SortOption = 'historicalLow' | 'discount'

export interface GameDeal {
  id: string
  title: string
  platform: Platform
  thumbnailUrl: string
  /** 할인 종료 시각 (ISO 8601). API 딜은 없을 수 있어요. */
  endsAt?: string
  originalPrice: number
  salePrice: number
  discountRate: number
  /** CheapShark API로 확인된 역대 최저가 여부 (Steam·Epic만) */
  isHistoricalLow: boolean
  /** 스토어 링크 — 화면 전환 없이 리스트만 보여주므로 UI에서는 사용하지 않아요. */
  dealUrl?: string
}
