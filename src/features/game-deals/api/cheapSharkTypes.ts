/** CheapShark /deals 응답 아이템 */
export interface CheapSharkDeal {
  dealID: string
  gameID: string
  title: string
  storeID: string
  salePrice: string
  normalPrice: string
  savings: string
  isOnSale: string
  steamAppID: string | null
  thumb: string
  steamRatingCount?: string | null
  steamRatingPercent?: string | null
  steamRatingText?: string | null
  dealRating?: string | null
  metacriticScore?: string | null
}

/** CheapShark /games?id= 응답 */
export interface CheapSharkGameDetail {
  info: {
    title: string
    steamAppID: string | null
    thumb: string
  }
  cheapestPriceEver: {
    price: string
    date: number
  }
}
