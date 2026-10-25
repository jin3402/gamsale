import { formatWishlistText } from './formatWishlist'
import { shareMessage, type ShareOutcome } from '../share'
import type { GameDeal } from '../types'

/** 위시리스트 전체를 공유해요. */
export async function shareWishlist(deals: GameDeal[]): Promise<ShareOutcome> {
  return shareMessage(formatWishlistText(deals), '할인 게임 위시리스트')
}
