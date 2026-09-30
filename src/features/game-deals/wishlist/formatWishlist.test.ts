import { describe, expect, it } from 'vitest'
import type { GameDeal } from '../types'
import { formatDealShareText, formatWishlistText } from './formatWishlist'

const hades: GameDeal = {
  id: 'steam-1',
  title: 'Hades',
  platform: 'Steam',
  thumbnailUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg',
  originalPrice: 27000,
  salePrice: 13500,
  discountRate: 50,
}

describe('formatWishlist', () => {
  it('개별 공유 문구에 할인율·가격·스토어 링크를 담는다', () => {
    expect(formatDealShareText(hades)).toBe(
      [
        '겜세일에서 발견한 할인 게임',
        '',
        '[Steam] Hades',
        '   -50% · 13,500원 (정가 27,000원)',
        '   https://store.steampowered.com/app/1145360',
      ].join('\n'),
    )
  })

  it('위시리스트 공유는 같은 형식에 번호를 붙인다', () => {
    const text = formatWishlistText([hades])
    expect(text.split('\n').slice(0, 3)).toEqual([
      '할인 게임 위시리스트 (1개)',
      '',
      '1. [Steam] Hades',
    ])
  })

  it('빈 위시리스트', () => {
    expect(formatWishlistText([])).toBe('위시리스트가 비어 있어요.')
  })
})
