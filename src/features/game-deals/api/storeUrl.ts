import type { GameDeal, Platform } from '../types'
import type { CheapSharkDeal } from './cheapSharkTypes'

/**
 * 저장된 링크가 해당 플랫폼 스토어의 https 주소인지 확인해요.
 * `includes('xbox.com')` 같은 부분 문자열 비교는 `javascript:...xbox.com`이나
 * `https://다른사이트/?q=xbox.com`도 통과시켜서, 호스트 이름을 직접 비교해요.
 */
export function isTrustedStoreUrl(url: string | undefined, domain: string): url is string {
  if (!url) return false
  try {
    const { protocol, hostname } = new URL(url)
    return protocol === 'https:' && (hostname === domain || hostname.endsWith(`.${domain}`))
  } catch {
    return false
  }
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
 * 스토어 이동·공유·위시리스트 저장본 보정에 쓰는 최종 링크예요.
 * 플랫폼 스토어의 https 링크만 그대로 쓰고, 나머지(예전 CheapShark 리다이렉트 등)는
 * 해당 스토어의 상품/검색 페이지로 바꿔요.
 */
export function resolveStoreUrl(deal: GameDeal): string {
  const query = encodeURIComponent(deal.title)
  const direct = deal.dealUrl?.trim()

  switch (deal.platform) {
    case 'Steam': {
      const appId = extractSteamAppId(deal)
      if (appId) return `https://store.steampowered.com/app/${appId}`
      if (isTrustedStoreUrl(direct, 'steampowered.com')) return direct
      return `https://store.steampowered.com/search/?term=${query}`
    }
    case 'Epic Games':
      if (isTrustedStoreUrl(direct, 'epicgames.com')) return direct
      return `https://store.epicgames.com/en-US/browse?q=${query}&sortBy=relevancy&sortDir=DESC`
    case 'Xbox':
      if (isTrustedStoreUrl(direct, 'xbox.com')) return direct
      return `https://www.xbox.com/en-US/search?q=${query}`
    case 'PlayStation':
      if (isTrustedStoreUrl(direct, 'playstation.com')) return direct
      return `https://store.playstation.com/en-us/search/${query}`
    case 'Nintendo Switch':
      if (isTrustedStoreUrl(direct, 'nintendo.co.kr')) return direct
      return `https://store.nintendo.co.kr/catalogsearch/result/?q=${query}`
  }
}
