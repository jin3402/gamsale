import { afterEach, describe, expect, it } from 'vitest'
import { loadWishlist, saveWishlist } from './wishlistStorage'
import type { GameDeal } from '../types'

const STORAGE_KEY = 'game-deal-alert:wishlist:v1'

const nintendoDeal: GameDeal = {
  id: 'switch-70010000127282',
  title: 'Judy&#039;s Adventure DX',
  platform: 'Nintendo Switch',
  thumbnailUrl: '',
  originalPrice: 6700,
  salePrice: 1340,
  discountRate: 80,
  dealUrl: 'https://store.nintendo.co.kr/70010000127282',
}

afterEach(() => localStorage.clear())

describe('wishlistStorage', () => {
  it('저장한 목록을 다시 불러온다', () => {
    const steamDeal: GameDeal = {
      ...nintendoDeal,
      id: 'steam-1',
      title: 'Hades',
      platform: 'Steam',
      thumbnailUrl: 'https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg',
      dealUrl: undefined,
    }
    saveWishlist([steamDeal])
    expect(loadWishlist()).toEqual([{ ...steamDeal, dealUrl: 'https://store.steampowered.com/app/1145360' }])
  })

  it('예전에 저장된 닌텐도 제목의 HTML 엔티티를 풀어서 불러온다', () => {
    saveWishlist([nintendoDeal])
    expect(loadWishlist()[0].title).toBe("Judy's Adventure DX")
  })

  it('예전 CheapShark 리다이렉트 링크를 스토어 링크로 바꾼다', () => {
    saveWishlist([
      {
        ...nintendoDeal,
        id: 'epic-1',
        title: 'Control',
        platform: 'Epic Games',
        dealUrl: 'https://www.cheapshark.com/redirect?dealID=abc',
      },
    ])
    expect(loadWishlist()[0].dealUrl).toBe(
      'https://store.epicgames.com/en-US/browse?q=Control&sortBy=relevancy&sortDir=DESC',
    )
  })

  it('형식이 깨진 저장값은 무시한다', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadWishlist()).toEqual([])

    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 1 }, null, 'x']))
    expect(loadWishlist()).toEqual([])
  })
})
