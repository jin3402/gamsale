import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheapSharkDeal } from './cheapSharkTypes'
import { fetchMoreEpicDeals } from './epicClient'
import {
  canLoadMoreDeals,
  createInitialLoadMoreCursor,
  fetchMoreGameDeals,
} from './fetchGameDeals'
import { fetchMoreSteamDeals } from './steamClient'

vi.mock('./steamClient', () => ({ fetchMoreSteamDeals: vi.fn(), fetchPopularSteamDeals: vi.fn() }))
vi.mock('./epicClient', () => ({ fetchMoreEpicDeals: vi.fn(), fetchPopularEpicDeals: vi.fn() }))
vi.mock('./exchangeRate', () => ({ getUsdKrwRate: async () => 1000 }))

function cheapSharkDeal(overrides: Partial<CheapSharkDeal>): CheapSharkDeal {
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
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(fetchMoreSteamDeals).mockReset()
  vi.mocked(fetchMoreEpicDeals).mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('canLoadMoreDeals', () => {
  it('콘솔 플랫폼은 빌드 스냅샷만 쓰므로 더 불러오지 않는다', () => {
    const cursor = createInitialLoadMoreCursor()
    expect(canLoadMoreDeals('Xbox', cursor)).toBe(false)
    expect(canLoadMoreDeals('PlayStation', cursor)).toBe(false)
    expect(canLoadMoreDeals('Nintendo Switch', cursor)).toBe(false)
  })

  it('전체 탭은 Steam·Epic 중 하나라도 남아 있으면 더 불러온다', () => {
    const cursor = { ...createInitialLoadMoreCursor(), steamExhausted: true }
    expect(canLoadMoreDeals('전체', cursor)).toBe(true)
    expect(canLoadMoreDeals('전체', { ...cursor, epicExhausted: true })).toBe(false)
  })
})

describe('fetchMoreGameDeals', () => {
  it('다음 페이지를 받아 원화로 바꾸고 커서를 한 칸 옮긴다', async () => {
    vi.mocked(fetchMoreSteamDeals).mockResolvedValue([
      cheapSharkDeal({ dealID: 'a', title: 'A', savings: '40' }),
      cheapSharkDeal({ dealID: 'b', title: 'B', savings: '75' }),
    ])

    const { deals, cursor } = await fetchMoreGameDeals(
      'Steam',
      new Set(),
      createInitialLoadMoreCursor(),
    )

    expect(deals.map((deal) => [deal.title, deal.discountRate, deal.salePrice])).toEqual([
      ['B', 75, 5000],
      ['A', 40, 5000],
    ])
    expect(cursor.steamPage).toBe(createInitialLoadMoreCursor().steamPage + 1)
    expect(fetchMoreEpicDeals).not.toHaveBeenCalled()
  })

  it('빈 페이지나 요청 실패는 해당 스토어를 소진 처리하고 예외를 던지지 않는다', async () => {
    vi.mocked(fetchMoreSteamDeals).mockResolvedValue([])
    vi.mocked(fetchMoreEpicDeals).mockRejectedValue(new Error('429'))

    const { deals, cursor } = await fetchMoreGameDeals(
      '전체',
      new Set(),
      createInitialLoadMoreCursor(),
    )

    expect(deals).toEqual([])
    expect(cursor.steamExhausted).toBe(true)
    expect(cursor.epicExhausted).toBe(true)
    expect(canLoadMoreDeals('전체', cursor)).toBe(false)
  })
})
