import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatWishlistText } from '../features/game-deals/wishlist/formatWishlist'
import { useWishlist } from '../features/game-deals/wishlist/useWishlist'
import { DealCard, DealCardSkeleton } from './components/DealCard'
import { DealDetail } from './components/DealDetail'
import { FilterBar } from './components/FilterBar'
import { HeartIcon } from './components/icons'
import { SearchBar } from './components/SearchBar'
import { WishlistDrawer } from './components/WishlistDrawer'
import { consoleDealSnapshot } from './data/catalog'
import { fetchDealDetail, webDealFromDetail } from './data/cheapshark'
import { isAdultContent } from './data/contentFilter'
import { DEFAULT_QUERY, applyQuery, dedupeDeals, filterWithoutPlatform, serializeQuery } from './data/query'
import { PLATFORMS, asWebDeal, platformKeyOf, type PlatformKey, type WebDeal } from './data/types'
import { formatCount, formatDealPrice } from './format'
import { useCatalog } from './hooks/useCatalog'
import { useCheapSharkSearch } from './hooks/useCheapSharkSearch'
import { useUrlQuery } from './hooks/useUrlQuery'
import { shareOrCopy } from './share'

const PAGE_SIZE = 36
const SUGGESTION_COUNT = 8

/** "Hogwarts Legacy: Deluxe Edition" → "Hogwarts Legacy" 처럼 검색어로 쓰기 좋게 줄여요. */
function shortTitle(title: string) {
  return title.split(/\s[-–—]\s|:|\s\(/)[0].trim().slice(0, 28)
}

const snapshotDate = new Date(consoleDealSnapshot.generatedAt).toLocaleDateString('ko-KR', {
  month: 'long',
  day: 'numeric',
})

export default function App() {
  const { query, setQuery, gameId, openGame, closeGame } = useUrlQuery()
  const catalog = useCatalog()
  const search = useCheapSharkSearch(query.q, catalog.rate)
  const wishlist = useWishlist()
  const [wishlistOpen, setWishlistOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [linkedDeal, setLinkedDeal] = useState<WebDeal | null>(null)

  const allDeals = useMemo(() => dedupeDeals([...catalog.deals, ...search.deals]), [catalog.deals, search.deals])
  const results = useMemo(() => applyQuery(allDeals, query), [allDeals, query])
  // 필터를 넣기 전에 찜해 둔 성인·선정성 게임도 목록에서 보이지 않게 해요.
  const wishItems = useMemo(
    () => wishlist.items.filter((deal) => !isAdultContent(deal.title)).map(asWebDeal),
    [wishlist.items],
  )

  const platformCounts = useMemo(() => {
    const counts = Object.fromEntries(PLATFORMS.map((info) => [info.key, 0])) as Record<PlatformKey, number>
    for (const deal of filterWithoutPlatform(allDeals, query)) counts[platformKeyOf(deal.platform)] += 1
    return counts
  }, [allDeals, query])
  const countAll = Object.values(platformCounts).reduce((sum, value) => sum + value, 0)

  const stats = useMemo(() => {
    const onSale = catalog.deals.filter((deal) => deal.discountRate > 0)
    return {
      total: onSale.length,
      maxDiscount: onSale.reduce((max, deal) => Math.max(max, deal.discountRate), 0),
      free: onSale.filter((deal) => deal.salePrice === 0).length,
    }
  }, [catalog.deals])

  // 추천 검색어는 지금 할인 중인 게임 중 스팀 리뷰가 많은(인기) 게임으로 골라요. 누르면 항상 결과가 나와요.
  const suggestions = useMemo(() => {
    const words = new Set<string>()
    const popular = catalog.deals
      .filter((deal) => deal.discountRate > 0 && deal.steamRatingCount)
      .sort((a, b) => (b.steamRatingCount ?? 0) - (a.steamRatingCount ?? 0))
    for (const deal of popular) {
      const word = shortTitle(deal.title)
      if (word.length >= 2) words.add(word)
      if (words.size >= SUGGESTION_COUNT) break
    }
    return [...words]
  }, [catalog.deals])

  // 검색 조건이 바뀌면 처음부터 PAGE_SIZE개만 보여줘요.
  const queryKey = serializeQuery(query)
  const [paging, setPaging] = useState({ key: queryKey, count: PAGE_SIZE })
  const visibleCount = paging.key === queryKey ? paging.count : PAGE_SIZE
  const visible = results.slice(0, visibleCount)
  const hasMoreLocal = visibleCount < results.length
  const canFetchMore = !query.q && catalog.canLoadMore

  const showMore = useCallback(() => {
    if (hasMoreLocal) setPaging({ key: queryKey, count: visibleCount + PAGE_SIZE })
    else if (canFetchMore) void catalog.loadMore()
  }, [hasMoreLocal, queryKey, visibleCount, canFetchMore, catalog])

  // 목록 끝에 닿으면 자동으로 더 보여줘요.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) showMore()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [showMore])

  // 공유 링크(?game=)로 들어왔는데 목록에 없는 게임이면 CheapShark에서 직접 찾아와요.
  const selectedFromLists =
    gameId === null ? null : (allDeals.find((deal) => deal.id === gameId) ?? wishItems.find((deal) => deal.id === gameId) ?? null)
  const selected = selectedFromLists ?? (linkedDeal?.id === gameId ? linkedDeal : null)

  useEffect(() => {
    if (!gameId || selectedFromLists || catalog.rate === null || catalog.isLoading) return
    const match = gameId.match(/^(steam|epic)-(.+)$/)
    if (!match) return
    let cancelled = false
    const rate = catalog.rate
    fetchDealDetail(match[2])
      .then((detail) => {
        if (cancelled) return
        const deal = webDealFromDetail(match[2], detail, rate)
        if (deal) setLinkedDeal({ ...deal, id: gameId })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [gameId, selectedFromLists, catalog.rate, catalog.isLoading])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const toggleWish = useCallback(
    (deal: WebDeal) => {
      const had = wishlist.has(deal.id)
      wishlist.toggle(deal)
      setToast(had ? '찜 목록에서 뺐어요.' : '찜 목록에 담았어요.')
    },
    [wishlist],
  )

  const openDeal = useCallback((deal: WebDeal) => openGame(deal.id), [openGame])

  const shareDeal = useCallback(async (deal: WebDeal) => {
    const url = `${window.location.origin}${window.location.pathname}?game=${encodeURIComponent(deal.id)}`
    const text = `${deal.title} ${deal.discountRate > 0 ? `-${deal.discountRate}% ` : ''}${formatDealPrice(deal, deal.salePrice)}`
    const outcome = await shareOrCopy({ title: deal.title, text, url })
    if (outcome === 'copied') setToast('링크를 복사했어요.')
    if (outcome === 'failed') setToast('공유하지 못했어요.')
  }, [])

  const shareWishlist = useCallback(async () => {
    const text = `${formatWishlistText(wishItems)}\n\n겜세일: ${window.location.origin}`
    const outcome = await shareOrCopy({ title: '할인 게임 위시리스트', text })
    if (outcome === 'copied') setToast('찜 목록을 복사했어요.')
    if (outcome === 'failed') setToast('공유하지 못했어요.')
  }, [wishItems])

  const isSearching = query.q.trim().length >= 2 && search.status === 'loading'
  const showSkeleton = (catalog.isLoading || isSearching) && results.length < 12
  const koreanQuery = /[가-힣]/.test(query.q)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <a className="brand" href="/" aria-label="겜세일 홈">
            <span className="brand__mark" aria-hidden>
              %
            </span>
            <span className="brand__name">겜세일</span>
          </a>
          <SearchBar value={query.q} onChange={(q) => setQuery({ q })} isSearching={isSearching} />
          <button type="button" className="wish-button" onClick={() => setWishlistOpen(true)} aria-label={`찜한 게임 ${wishItems.length}개`}>
            <HeartIcon filled={wishItems.length > 0} />
            {wishItems.length > 0 && <span className="wish-button__count">{wishItems.length}</span>}
          </button>
        </div>
      </header>

      <main className="main">
        {!query.q && (
          <section className="hero">
            <h1>
              스팀·에픽·콘솔 할인 게임,
              <br />
              <span className="accent">한 번에 검색</span>하세요
            </h1>
            <p className="hero__stats">
              {catalog.isLoading && stats.total === 0 ? (
                '할인 정보를 모으는 중이에요…'
              ) : (
                <>
                  지금 <strong>{formatCount(stats.total)}개</strong> 할인 중 · 최대 <strong>{stats.maxDiscount}%</strong>
                  {stats.free > 0 && (
                    <>
                      {' '}
                      · 무료 <strong>{stats.free}개</strong>
                    </>
                  )}
                </>
              )}
            </p>
            <div className="suggestions" aria-label="지금 인기 할인">
              {suggestions.length > 0 && <span className="suggestions__label">지금 인기 할인</span>}
              {suggestions.map((word) => (
                <button key={word} type="button" className="suggestion" onClick={() => setQuery({ q: word })}>
                  {word}
                </button>
              ))}
              {stats.free > 0 && (
                <button type="button" className="suggestion suggestion--hot" onClick={() => setQuery({ maxPrice: 0 })}>
                  🎁 무료 게임
                </button>
              )}
            </div>
          </section>
        )}

        <FilterBar
          query={query}
          platformCounts={platformCounts}
          totalCount={countAll}
          onChange={setQuery}
          onReset={() => setQuery({ ...DEFAULT_QUERY, q: query.q })}
        />

        <div className="results-head">
          <p>
            {query.q ? (
              <>
                <strong>‘{query.q}’</strong> 검색 결과 <strong>{formatCount(results.length)}</strong>개
              </>
            ) : (
              <>
                할인 게임 <strong>{formatCount(results.length)}</strong>개
              </>
            )}
            {catalog.isLoading && <span className="muted"> · 더 불러오는 중</span>}
          </p>
          {query.q && koreanQuery && (
            <p className="hint">스팀·에픽 게임은 영어 제목으로 검색해야 잘 찾아져요. 한글 검색은 콘솔(스위치 등) 게임 위주예요.</p>
          )}
        </div>

        {(catalog.errors.length > 0 || search.status === 'error') && (
          <div className="notice" role="status">
            {catalog.errors.map((error) => (
              <p key={error.label}>
                {error.label}: {error.message}
              </p>
            ))}
            {search.status === 'error' && <p>검색: {search.error}</p>}
          </div>
        )}

        {results.length === 0 && !showSkeleton ? (
          <div className="empty">
            <p className="empty__title">조건에 맞는 할인 게임이 없어요</p>
            <p className="muted">
              {query.q && !query.includeFullPrice
                ? '할인 중이 아닌 게임까지 보려면 ‘정가 게임도 보기’를 켜 보세요.'
                : '필터를 줄이거나 다른 검색어로 찾아보세요.'}
            </p>
            <div className="empty__actions">
              {query.q && !query.includeFullPrice && (
                <button type="button" className="button" onClick={() => setQuery({ includeFullPrice: true })}>
                  정가 게임도 보기
                </button>
              )}
              <button type="button" className="button" onClick={() => setQuery(DEFAULT_QUERY)}>
                처음부터 다시
              </button>
            </div>
          </div>
        ) : (
          <div className="grid">
            {visible.map((deal) => (
              <DealCard key={deal.id} deal={deal} wished={wishlist.has(deal.id)} onOpen={openDeal} onToggleWish={toggleWish} />
            ))}
            {showSkeleton && Array.from({ length: 8 }, (_, index) => <DealCardSkeleton key={`skeleton-${index}`} />)}
          </div>
        )}

        <div ref={sentinelRef} className="sentinel" aria-hidden />
        {(hasMoreLocal || canFetchMore || catalog.isLoadingMore) && results.length > 0 && (
          <div className="more">
            <button type="button" className="button" onClick={showMore} disabled={catalog.isLoadingMore}>
              {catalog.isLoadingMore ? '불러오는 중…' : hasMoreLocal ? '더 보기' : 'Steam·Epic 할인 더 불러오기'}
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Steam·Epic 가격은 <a href="https://www.cheapshark.com" target="_blank" rel="noopener noreferrer">CheapShark</a>의 미국 스토어 가격을
          {catalog.rate ? ` 1달러 = ${formatCount(Math.round(catalog.rate))}원으로` : ''} 환산한 값이에요. PlayStation·Xbox·Switch 가격은 {snapshotDate} 기준이에요.
        </p>
        <p className="muted">게임 이름·이미지의 권리는 각 권리자에게 있어요. 구매 전 스토어에서 최종 가격을 확인해 주세요.</p>
      </footer>

      {selected && (
        <DealDetail
          deal={selected}
          usdKrwRate={catalog.rate}
          snapshotDate={snapshotDate}
          wished={wishlist.has(selected.id)}
          onToggleWish={toggleWish}
          onShare={shareDeal}
          onClose={closeGame}
        />
      )}

      {wishlistOpen && (
        <WishlistDrawer
          items={wishItems}
          onOpenDeal={(deal) => {
            setWishlistOpen(false)
            openDeal(deal)
          }}
          onRemove={wishlist.remove}
          onClear={wishlist.clear}
          onShare={shareWishlist}
          onClose={() => setWishlistOpen(false)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
