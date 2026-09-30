import { useCallback, useEffect, useRef, useState } from 'react'
import {
  canLoadMoreDeals,
  createInitialLoadMoreCursor,
  fetchGameDeals,
  fetchMoreGameDeals,
  type LoadMoreCursor,
} from './api/fetchGameDeals'
import { toTitleKey } from './api/cheapSharkDeals'
import type { GameDeal, Platform } from './types'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useGameDeals(platform: '전체' | Platform) {
  const [deals, setDeals] = useState<GameDeal[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreRemote, setHasMoreRemote] = useState(false)

  const cursorRef = useRef<LoadMoreCursor>(createInitialLoadMoreCursor())
  const knownTitlesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setErrorMessage(null)
      setHasMoreRemote(false)
      cursorRef.current = createInitialLoadMoreCursor()

      try {
        const next = await fetchGameDeals(platform)
        if (cancelled) return
        knownTitlesRef.current = new Set(next.map((deal) => toTitleKey(deal.title)))
        setDeals(next)
        setStatus('success')
        setHasMoreRemote(canLoadMoreDeals(platform, cursorRef.current))
      } catch (error) {
        if (cancelled) return
        const message =
          error instanceof Error ? error.message : '할인 정보를 불러오지 못했어요.'
        setDeals([])
        setErrorMessage(message)
        setStatus('error')
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [platform, reloadKey])

  /**
   * 미리 전부 연동해두지 않고, 지금까지 보여준 목록을 다 스크롤했을 때만 실시간으로
   * Steam/Epic의 다음 페이지를 더 가져와요. (콘솔 플랫폼은 CORS 때문에 대상이 아니에요.)
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !canLoadMoreDeals(platform, cursorRef.current)) return

    setIsLoadingMore(true)
    try {
      const { deals: more, cursor } = await fetchMoreGameDeals(
        platform,
        knownTitlesRef.current,
        cursorRef.current,
      )
      cursorRef.current = cursor

      if (more.length > 0) {
        for (const deal of more) knownTitlesRef.current.add(toTitleKey(deal.title))
        setDeals((prev) => [...prev, ...more])
      }

      setHasMoreRemote(canLoadMoreDeals(platform, cursor))
    } finally {
      setIsLoadingMore(false)
    }
  }, [platform, isLoadingMore])

  return {
    deals,
    /** 목록이 새로 로드될 때마다 바뀌는 키예요. '더보기'로 이어붙일 때는 그대로예요. */
    listKey: `${platform}:${reloadKey}`,
    status,
    errorMessage,
    isLoading: status === 'loading' || status === 'idle',
    isLoadingMore,
    hasMoreRemote,
    loadMore,
    reload: () => setReloadKey((key) => key + 1),
  }
}
