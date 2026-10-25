import { describe, expect, it } from 'vitest'
import type { GameDeal } from '../types'
import { consoleDealSnapshot } from './snapshots/consoleDeals'
import { isTrustedStoreUrl, resolveStoreUrl } from './storeUrl'

function deal(overrides: Partial<GameDeal>): GameDeal {
  return {
    id: 'x',
    title: 'Elden Ring',
    platform: 'Xbox',
    thumbnailUrl: '',
    originalPrice: 1,
    salePrice: 1,
    discountRate: 0,
    ...overrides,
  }
}

describe('isTrustedStoreUrl', () => {
  it('스토어 도메인과 그 하위 도메인의 https 링크만 허용한다', () => {
    expect(isTrustedStoreUrl('https://www.xbox.com/en-US/games/store/a/9N', 'xbox.com')).toBe(true)
    expect(isTrustedStoreUrl('https://xbox.com/', 'xbox.com')).toBe(true)
    expect(isTrustedStoreUrl('http://www.xbox.com/', 'xbox.com')).toBe(false)
    expect(isTrustedStoreUrl('https://notxbox.com/', 'xbox.com')).toBe(false)
    expect(isTrustedStoreUrl('https://evil.example/?q=xbox.com', 'xbox.com')).toBe(false)
    expect(isTrustedStoreUrl('javascript:alert(1)//xbox.com', 'xbox.com')).toBe(false)
    expect(isTrustedStoreUrl('not a url', 'xbox.com')).toBe(false)
    expect(isTrustedStoreUrl(undefined, 'xbox.com')).toBe(false)
  })
})

describe('resolveStoreUrl', () => {
  it('Steam은 썸네일의 앱 ID로 상품 페이지를 만든다', () => {
    const steam = deal({
      platform: 'Steam',
      thumbnailUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg',
      dealUrl: 'https://www.cheapshark.com/redirect?dealID=abc',
    })
    expect(resolveStoreUrl(steam)).toBe('https://store.steampowered.com/app/1245620')
  })

  it('믿을 수 없는 링크는 해당 스토어 검색 페이지로 바꾼다', () => {
    expect(resolveStoreUrl(deal({ dealUrl: 'javascript:alert(1)//xbox.com' }))).toBe(
      'https://www.xbox.com/en-US/search?q=Elden%20Ring',
    )
    expect(
      resolveStoreUrl(deal({ platform: 'PlayStation', dealUrl: 'https://evil.example/playstation.com' })),
    ).toBe('https://store.playstation.com/en-us/search/Elden%20Ring')
  })

  it('현재 스냅샷의 모든 콘솔 딜 링크는 그대로 유지된다', () => {
    const all = [
      ...consoleDealSnapshot.nintendo,
      ...consoleDealSnapshot.playstation,
      ...consoleDealSnapshot.xbox,
    ]
    const changed = all.filter((item) => resolveStoreUrl(item) !== item.dealUrl)
    expect(changed).toEqual([])
  })
})
