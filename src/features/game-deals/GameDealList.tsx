import { useEffect, useMemo, useState } from 'react'
import { Button, Loader, Result, SegmentedControl, Top } from '@toss/tds-mobile'
import { DEAL_PAGE_SIZE } from './api/config'
import BannerAd from './ads/BannerAd'
import { useInterstitialAd } from './ads/useInterstitialAd'
import { buildFeedItems } from './buildFeedItems'
import GameDealCard from './GameDealCard'
import {
  cancelDiscountEndNotification,
  scheduleDiscountEndNotification,
} from './notifications/scheduleDiscountEndNotification'
import PlatformFilterChips, { type PlatformFilterValue } from './PlatformFilterChips'
import type { GameDeal, SortOption } from './types'
import { useGameDeals } from './useGameDeals'

function formatEndsAt(value?: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${month}/${day} ${hours}:${minutes}까지`
}

export default function GameDealList() {
  const [platform, setPlatform] = useState<PlatformFilterValue>('전체')
  const [sort, setSort] = useState<SortOption>('discount')
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [visibleCount, setVisibleCount] = useState(DEAL_PAGE_SIZE)
  const { deals, isLoading, status, errorMessage, reload } = useGameDeals(platform, sort)
  const { show: showInterstitial } = useInterstitialAd()

  useEffect(() => {
    setVisibleCount(DEAL_PAGE_SIZE)
  }, [platform, sort, deals])

  const visibleDeals = useMemo(
    () => deals.slice(0, visibleCount),
    [deals, visibleCount],
  )
  const feedItems = useMemo(() => buildFeedItems(visibleDeals, 5), [visibleDeals])
  const hasMore = visibleCount < deals.length

  /** 전체 → 개별 플랫폼 칩으로 전환할 때 전면형 광고 노출 */
  const handlePlatformChange = (next: PlatformFilterValue) => {
    if (platform === '전체' && next !== '전체') {
      showInterstitial()
    }
    setPlatform(next)
  }

  const toggleWishlist = (deal: GameDeal) => {
    setWishlistIds((prev) => {
      const next = new Set(prev)
      const isAdding = !next.has(deal.id)

      if (isAdding) {
        next.add(deal.id)
        void scheduleDiscountEndNotification({ deal, daysBeforeEnd: 1 })
      } else {
        next.delete(deal.id)
        void cancelDiscountEndNotification(deal.id)
      }

      return next
    })
  }

  return (
    <div className="game-deal-list">
      <Top
        title={<Top.TitleParagraph>할인 게임 알림</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph>
            인기 할인 게임을 실시간으로 보여드려요 (최대 50개)
          </Top.SubtitleParagraph>
        }
      />

      <div className="game-deal-list__controls">
        <PlatformFilterChips value={platform} onChange={handlePlatformChange} />

        <div className="game-deal-list__sort">
          <SegmentedControl
            size="small"
            alignment="fluid"
            value={sort}
            onChange={(value) => setSort(value as SortOption)}
          >
            <SegmentedControl.Item value="historicalLow">역대 최저가</SegmentedControl.Item>
            <SegmentedControl.Item value="discount">할인율 높은 순</SegmentedControl.Item>
          </SegmentedControl>
        </div>
      </div>

      {isLoading ? (
        <div className="game-deal-list__state">
          <Loader size="large" label="할인 정보를 불러오는 중이에요" />
        </div>
      ) : null}

      {!isLoading && status === 'error' ? (
        <Result
          title="할인 정보를 불러오지 못했어요"
          description={errorMessage ?? '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'}
          button={<Result.Button onClick={reload}>다시 시도</Result.Button>}
        />
      ) : null}

      {!isLoading && status === 'success' && deals.length === 0 ? (
        <div className="game-deal-list__empty">해당 플랫폼의 인기 할인 게임이 없어요.</div>
      ) : null}

      {!isLoading && status === 'success' && feedItems.length > 0 ? (
        <>
          <div className="game-deal-list__items" role="list">
            {feedItems.map((item) =>
              item.type === 'ad' ? (
                <div key={item.key} role="listitem" className="game-deal-list__ad-slot">
                  <BannerAd slotIndex={item.slotIndex} />
                </div>
              ) : (
                <div key={item.key} role="listitem">
                  <GameDealCard
                    deal={item.deal}
                    wishlisted={wishlistIds.has(item.deal.id)}
                    endsAtLabel={formatEndsAt(item.deal.endsAt)}
                    onToggleWishlist={() => toggleWishlist(item.deal)}
                  />
                </div>
              ),
            )}
          </div>

          {hasMore ? (
            <div className="game-deal-list__more">
              <Button
                size="large"
                display="block"
                onClick={() =>
                  setVisibleCount((count) => Math.min(count + DEAL_PAGE_SIZE, deals.length))
                }
              >
                {`더보기 (${Math.min(visibleCount, deals.length)}/${deals.length})`}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
