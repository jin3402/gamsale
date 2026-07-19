import type { GameDeal, Platform } from '../types'
import type { CheapSharkDeal } from './cheapSharkTypes'
import { toKrw } from './money'

export function mapCheapSharkDeal(
  deal: CheapSharkDeal,
  usdKrwRate: number,
  options: {
    platform?: Extract<Platform, 'Steam' | 'Epic Games'>
    isHistoricalLow?: boolean
    idPrefix?: string
  } = {},
): GameDeal {
  const platform = options.platform ?? 'Steam'
  const isHistoricalLow = options.isHistoricalLow ?? false
  const idPrefix = options.idPrefix ?? (platform === 'Epic Games' ? 'epic' : 'steam')

  const originalUsd = Number(deal.normalPrice)
  const saleUsd = Number(deal.salePrice)
  const discountRate = Math.round(Number(deal.savings))

  const thumbnailUrl =
    platform === 'Steam' && deal.steamAppID
      ? `https://cdn.akamai.steamstatic.com/steam/apps/${deal.steamAppID}/header.jpg`
      : deal.thumb

  return {
    id: `${idPrefix}-${deal.dealID}`,
    title: deal.title,
    platform,
    thumbnailUrl,
    endsAt: undefined,
    originalPrice: toKrw(originalUsd, usdKrwRate),
    salePrice: toKrw(saleUsd, usdKrwRate),
    discountRate: Number.isFinite(discountRate) ? discountRate : 0,
    isHistoricalLow,
    dealUrl: `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(deal.dealID)}`,
  }
}
