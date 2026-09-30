import { useMemo, useState } from 'react'
import { Button, IconButton, Loader, Result, Top } from '@toss/tds-mobile'
import BannerAd from './ads/BannerAd'
import { useInterstitialAd } from './ads/useInterstitialAd'
import { buildFeedItems } from './buildFeedItems'
import DealActionSheet from './DealActionSheet'
import { formatEndsAt } from './format'
import GameDealCard from './GameDealCard'
import PlatformFilterChips, { type PlatformFilterValue } from './PlatformFilterChips'
import { useEntryPromotionReward } from './promotion/usePromotionReward'
import type { GameDeal } from './types'
import { useDealPaging } from './useDealPaging'
import { useGameDeals } from './useGameDeals'
import { WishlistProvider } from './wishlist/WishlistContext'
import { useWishlistContext } from './wishlist/useWishlistContext'
import WishlistPanel from './wishlist/WishlistPanel'

function GameDealListInner() {
  const [platform, setPlatform] = useState<PlatformFilterValue>('전체')
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [actionDeal, setActionDeal] = useState<GameDeal | null>(null)
  const {
    deals,
    listKey,
    isLoading,
    status,
    errorMessage,
    reload,
    isLoadingMore,
    hasMoreRemote,
    loadMore,
  } = useGameDeals(platform)
  // 플랫폼을 바꾸거나 다시 시도할 때만 처음 개수로 돌아가요. (원격 '더보기' 뒤에는 유지)
  const { visibleCount, showMore } = useDealPaging(listKey)
  const { has, toggle, count } = useWishlistContext()
  // 스토어 이동 전 전면 광고용 — 미리 백그라운드에서 로드해둬요.
  const { show: showInterstitialAd } = useInterstitialAd()
  // 앱 진입 시 "서비스 이용하기" 프로모션 포인트를 기기당 1회 지급해요.
  useEntryPromotionReward()

  const visibleDeals = useMemo(
    () => deals.slice(0, visibleCount),
    [deals, visibleCount],
  )
  const feedItems = useMemo(() => buildFeedItems(visibleDeals, 5), [visibleDeals])
  const hasMoreLocal = visibleCount < deals.length
  const hasMore = hasMoreLocal || hasMoreRemote

  const handlePlatformChange = (next: PlatformFilterValue) => {
    if (next === platform) return
    // 전체 ↔ Steam/Epic/Xbox/PlayStation/Nintendo 탭 전환 시에는 광고를 띄우지 않아요.
    setPlatform(next)
  }

  const handleLoadMore = async () => {
    if (hasMoreLocal) {
      // 이미 가져와 있는 목록 중 아직 안 보여준 부분만 먼저 펼쳐요. (네트워크 요청 없음)
      showMore(deals.length)
      return
    }

    if (!hasMoreRemote) return
    // 여기서부터는 미리 받아둔 목록을 다 본 거라, 실시간으로 다음 페이지를 더 가져와요.
    await loadMore()
    showMore()
  }

  return (
    <div className="game-deal-list">
      <Top
        title={<Top.TitleParagraph>겜세일</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph>
            스팀·에픽 할인 게임을 한눈에, 놓치지 않게
          </Top.SubtitleParagraph>
        }
        right={
          <div className="wishlist-entry">
            <IconButton
              variant="clear"
              name="icon-heart-mono"
              color={count > 0 ? '#f04452' : undefined}
              iconSize={22}
              aria-label={`위시리스트 ${count}개 보기`}
              onClick={() => setWishlistOpen(true)}
            />
            {count > 0 ? (
              <span className="wishlist-entry__badge" aria-hidden>
                {count}
              </span>
            ) : null}
          </div>
        }
      />

      <div className="game-deal-list__controls">
        <PlatformFilterChips value={platform} onChange={handlePlatformChange} />
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
                    wishlisted={has(item.deal.id)}
                    endsAtLabel={formatEndsAt(item.deal.endsAt)}
                    onToggleWishlist={() => toggle(item.deal)}
                    onOpenActions={() => setActionDeal(item.deal)}
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
                loading={isLoadingMore}
                onClick={() => void handleLoadMore()}
              >
                {`더보기 (${Math.min(visibleCount, deals.length)}/${deals.length}${hasMoreRemote ? '+' : ''})`}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <WishlistPanel open={wishlistOpen} onClose={() => setWishlistOpen(false)} />
      <DealActionSheet
        deal={actionDeal}
        onClose={() => setActionDeal(null)}
        showInterstitialAd={showInterstitialAd}
      />
    </div>
  )
}

export default function GameDealList() {
  return (
    <WishlistProvider>
      <GameDealListInner />
    </WishlistProvider>
  )
}
