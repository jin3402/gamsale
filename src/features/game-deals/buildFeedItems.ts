import type { GameDeal } from './types'

export type FeedItem =
  | { type: 'deal'; key: string; deal: GameDeal }
  | { type: 'ad'; key: string; slotIndex: number }

/**
 * 게임 5개마다 다음 칸에 배너 광고를 삽입해요.
 * 예: 게임 5개 → 광고(6번째), 게임 10개 → 광고(12번째)
 */
export function buildFeedItems(deals: GameDeal[], adEvery = 5): FeedItem[] {
  const items: FeedItem[] = []
  let gameCount = 0

  for (const deal of deals) {
    items.push({ type: 'deal', key: deal.id, deal })
    gameCount += 1

    if (gameCount % adEvery === 0) {
      const slotIndex = items.length + 1
      items.push({
        type: 'ad',
        key: `ad-after-${gameCount}`,
        slotIndex,
      })
    }
  }

  return items
}
