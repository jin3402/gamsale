import type { GameDeal, Platform } from '../../features/game-deals/types'

/** 가격·평점이 어디서 왔는지 — CheapShark 실시간이면 상세(역대 최저가 등)를 더 불러올 수 있어요. */
export type DealSource = 'cheapshark' | 'snapshot'

/** 웹 사이트에서 쓰는 딜. 미니앱의 GameDeal에 검색·정렬용 정보를 더했어요. */
export interface WebDeal extends GameDeal {
  source: DealSource
  /** CheapShark dealID (이미 URL 인코딩된 값이라 그대로 쿼리에 붙여요) */
  cheapSharkDealId?: string
  usdSalePrice?: number
  usdNormalPrice?: number
  steamRatingPercent?: number
  steamRatingCount?: number
  steamRatingText?: string
  metacriticScore?: number
  /** 출시일 (unix seconds) */
  releaseDate?: number
}

export type PlatformKey = 'steam' | 'epic' | 'ps' | 'xbox' | 'switch'

export interface PlatformInfo {
  key: PlatformKey
  platform: Platform
  label: string
}

export const PLATFORMS: PlatformInfo[] = [
  { key: 'steam', platform: 'Steam', label: 'Steam' },
  { key: 'epic', platform: 'Epic Games', label: 'Epic' },
  { key: 'ps', platform: 'PlayStation', label: 'PlayStation' },
  { key: 'xbox', platform: 'Xbox', label: 'Xbox' },
  { key: 'switch', platform: 'Nintendo Switch', label: 'Switch' },
]

export function platformKeyOf(platform: Platform): PlatformKey {
  return PLATFORMS.find((info) => info.platform === platform)?.key ?? 'steam'
}

export function platformLabelOf(platform: Platform): string {
  return PLATFORMS.find((info) => info.platform === platform)?.label ?? platform
}

/** 위시리스트(로컬 저장)에서 읽은 GameDeal을 WebDeal로 되돌려요. */
export function asWebDeal(deal: GameDeal): WebDeal {
  const maybe = deal as Partial<WebDeal>
  if (maybe.source) return deal as WebDeal
  const cheapShark = deal.id.startsWith('steam-') || deal.id.startsWith('epic-')
  return {
    ...deal,
    source: cheapShark ? 'cheapshark' : 'snapshot',
    cheapSharkDealId: cheapShark ? deal.id.replace(/^(steam|epic)-/, '') : undefined,
  }
}
