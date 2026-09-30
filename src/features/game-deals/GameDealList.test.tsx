import { act, fireEvent, render, screen } from '@testing-library/react'
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait'
import { describe, expect, it, vi } from 'vitest'
import GameDealList from './GameDealList'

vi.mock('./useGameDeals', async () => {
  const { useCallback, useState } = await import('react')
  type Deal = import('./types').GameDeal

  const makeDeals = (from: number, count: number): Deal[] =>
    Array.from({ length: count }, (_, index) => ({
      id: `steam-${from + index}`,
      title: `Game ${from + index}`,
      platform: 'Steam',
      thumbnailUrl: '',
      originalPrice: 10000,
      salePrice: 5000,
      discountRate: 50,
    }))

  return {
    useGameDeals: () => {
      const [deals, setDeals] = useState(() => makeDeals(0, 150))
      const loadMore = useCallback(async () => {
        setDeals((prev) => [...prev, ...makeDeals(prev.length, 10)])
      }, [])
      return {
        deals,
        listKey: 'Steam:0',
        status: 'success' as const,
        errorMessage: null,
        isLoading: false,
        isLoadingMore: false,
        hasMoreRemote: true,
        loadMore,
        reload: () => {},
      }
    },
  }
})
vi.mock('./ads/BannerAd', () => ({ default: () => null }))
vi.mock('./ads/useInterstitialAd', () => ({ useInterstitialAd: () => ({ show: () => false }) }))
vi.mock('./promotion/usePromotionReward', () => ({ useEntryPromotionReward: () => {} }))

function countCards(container: HTMLElement) {
  return container.querySelectorAll('.game-deal-card').length
}

describe('GameDealList 더보기', () => {
  it('받아둔 목록을 다 본 뒤 원격 더보기를 해도 목록이 처음으로 줄어들지 않는다', async () => {
    const { container } = render(
      <TDSMobileAITProvider>
        <GameDealList />
      </TDSMobileAITProvider>,
    )
    expect(countCards(container)).toBe(10)

    for (let i = 0; i < 14; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /더보기/ }))
    }
    expect(countCards(container)).toBe(150)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /더보기/ }))
    })
    expect(countCards(container)).toBe(160)
  }, 30_000) // TDS 카드 160개를 jsdom에서 그리는 데 몇 초 걸려요.
})
