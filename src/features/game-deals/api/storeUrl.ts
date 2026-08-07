import type { GameDeal, Platform } from '../types'
import type { CheapSharkDeal } from './cheapSharkTypes'

function isCheapSharkUrl(url: string) {
  return /cheapshark\.com/i.test(url)
}

function extractSteamAppId(deal: Pick<GameDeal, 'thumbnailUrl' | 'dealUrl'>) {
  const fromThumb = deal.thumbnailUrl?.match(/\/steam\/apps\/(\d+)\//)?.[1]
  if (fromThumb) return fromThumb
  const fromUrl = deal.dealUrl?.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1]
  return fromUrl ?? null
}

/** CheapShark 딜 → 스토어 직접 링크 */
export function storeUrlFromCheapShark(
  deal: CheapSharkDeal,
  platform: Extract<Platform, 'Steam' | 'Epic Games'>,
) {
  const query = encodeURIComponent(deal.title)

  if (platform === 'Steam') {
    if (deal.steamAppID) {
      return `https://store.steampowered.com/app/${deal.steamAppID}`
    }
    return `https://store.steampowered.com/search/?term=${query}`
  }

  return `https://store.epicgames.com/en-US/browse?q=${query}&sortBy=relevancy&sortDir=DESC`
}

/**
 * 위시리스트 공유·저장본 보정용.
 * CheapShark 링크는 버리고 플랫폼 스토어(상품/검색)로 연결해요.
 */
export function resolveStoreUrl(deal: GameDeal): string {
  const query = encodeURIComponent(deal.title)
  const existing = deal.dealUrl?.trim()
  const usableDirect =
    existing && !isCheapSharkUrl(existing) ? existing : undefined

  switch (deal.platform) {
    case 'Steam': {
      const appId = extractSteamAppId(deal)
      if (appId) return `https://store.steampowered.com/app/${appId}`
      if (usableDirect?.includes('steampowered.com')) return usableDirect
      return `https://store.steampowered.com/search/?term=${query}`
    }
    case 'Epic Games':
      if (usableDirect?.includes('epicgames.com')) return usableDirect
      return `https://store.epicgames.com/en-US/browse?q=${query}&sortBy=relevancy&sortDir=DESC`
    case 'Xbox':
      if (usableDirect?.includes('xbox.com')) return usableDirect
      return `https://www.xbox.com/en-US/search?q=${query}`
    case 'PlayStation':
      if (usableDirect?.includes('playstation.com')) return usableDirect
      return `https://store.playstation.com/en-us/search/${encodeURIComponent(deal.title)}`
    case 'Nintendo Switch':
      if (usableDirect?.includes('nintendo.co.kr')) return usableDirect
      return `https://store.nintendo.co.kr/catalogsearch/result/?q=${query}`
  }
}
