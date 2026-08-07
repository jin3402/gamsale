export type Platform =
  | 'Steam'
  | 'Nintendo Switch'
  | 'PlayStation'
  | 'Xbox'
  | 'Epic Games'

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
  /** 플랫폼 스토어 링크(상품 페이지 또는 검색). 위시리스트 공유에 사용해요. */
  dealUrl?: string
}
