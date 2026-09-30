import { describe, expect, it, vi } from 'vitest'
import { fetchCheapSharkDealPages } from './cheapSharkDeals'
import type { CheapSharkDeal } from './cheapSharkTypes'
import { fetchPopularSteamDeals } from './steamClient'

vi.mock('./cheapSharkDeals', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./cheapSharkDeals')>()),
  fetchCheapSharkDealPages: vi.fn(),
}))

function deal(overrides: Partial<CheapSharkDeal>): CheapSharkDeal {
  return {
    dealID: 'd',
    gameID: 'g',
    title: 'Game',
    storeID: '1',
    salePrice: '5.00',
    normalPrice: '10.00',
    savings: '50',
    isOnSale: '1',
    steamAppID: '10',
    thumb: '',
    steamRatingCount: '5000',
    steamRatingPercent: '90',
    ...overrides,
  }
}

describe('fetchPopularSteamDeals', () => {
  it('리뷰가 충분하고 평가가 좋은 할인만 남기고, 같은 게임은 한 번만, 할인율 순으로 정렬한다', async () => {
    const popular = Array.from({ length: 10 }, (_, index) =>
      deal({
        dealID: `p${index}`,
        steamAppID: `p${index}`,
        title: `Popular ${index}`,
        savings: `${50 + index}`,
      }),
    )
    vi.mocked(fetchCheapSharkDealPages).mockResolvedValue([
      ...popular,
      deal({ dealID: 'dup', steamAppID: 'p9', title: 'Popular 9 (dup)', savings: '59' }),
      deal({ dealID: 'bad', steamAppID: 'bad', title: 'Bad rating', steamRatingPercent: '40' }),
      deal({ dealID: 'few', steamAppID: 'few', title: 'Few reviews', steamRatingCount: '10' }),
    ])

    const titles = (await fetchPopularSteamDeals()).map((item) => item.title)
    expect(titles).toEqual(popular.map((item) => item.title).reverse())
  })

  it('조건에 맞는 게임이 10개 미만이면 평가 조건을 풀어 채운다 (판매 중이 아니거나 리뷰가 적으면 제외)', async () => {
    vi.mocked(fetchCheapSharkDealPages).mockResolvedValue([
      deal({ dealID: '1', steamAppID: '1', title: 'Popular 50%', savings: '50' }),
      deal({ dealID: '2', steamAppID: '2', title: 'Popular 80%', savings: '80' }),
      deal({ dealID: '3', steamAppID: '3', title: 'Bad rating', savings: '30', steamRatingPercent: '40' }),
      deal({ dealID: '4', steamAppID: '4', title: 'Few reviews', steamRatingCount: '10' }),
      deal({ dealID: '5', steamAppID: null, title: 'No app id' }),
      deal({ dealID: '6', steamAppID: '6', title: 'Not on sale', isOnSale: '0' }),
    ])

    const titles = (await fetchPopularSteamDeals()).map((item) => item.title)
    expect(titles).toEqual(['Popular 80%', 'Popular 50%', 'Bad rating'])
  })
})
