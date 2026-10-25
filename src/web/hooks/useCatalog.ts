import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getUsdKrwRate } from '../../features/game-deals/api/exchangeRate'
import { FIRST_MORE_PAGE, loadMorePlatformDeals, loadPlatformDeals } from '../data/catalog'
import { PLATFORMS, type PlatformKey, type WebDeal } from '../data/types'

type Status = 'loading' | 'ready' | 'error'

interface PlatformState {
  status: Status
  deals: WebDeal[]
  error?: string
}

const INITIAL: Record<PlatformKey, PlatformState> = {
  steam: { status: 'loading', deals: [] },
  epic: { status: 'loading', deals: [] },
  ps: { status: 'loading', deals: [] },
  xbox: { status: 'loading', deals: [] },
  switch: { status: 'loading', deals: [] },
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '할인 정보를 불러오지 못했어요.'
}

/**
 * 전체 할인 목록을 플랫폼별로 따로 불러와요.
 * 콘솔(스냅샷)은 바로 뜨고, Steam·Epic(CheapShark)은 요청 간격 제한 때문에 몇 초 뒤에 이어서 채워져요.
 */
export function useCatalog() {
  const [rate, setRate] = useState<number | null>(null)
  const [platforms, setPlatforms] = useState(INITIAL)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const moreCursor = useRef({ steam: FIRST_MORE_PAGE, epic: FIRST_MORE_PAGE })
  const [exhausted, setExhausted] = useState({ steam: false, epic: false })

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const usdKrwRate = await getUsdKrwRate()
      if (cancelled) return
      setRate(usdKrwRate)

      // 스냅샷 플랫폼을 먼저 시작해서 첫 화면이 빨리 채워지게 해요.
      const order: PlatformKey[] = ['ps', 'xbox', 'switch', 'steam', 'epic']
      await Promise.all(
        order.map(async (key) => {
          try {
            const deals = await loadPlatformDeals(key, usdKrwRate)
            if (!cancelled) setPlatforms((prev) => ({ ...prev, [key]: { status: 'ready', deals } }))
          } catch (error) {
            if (!cancelled) {
              setPlatforms((prev) => ({
                ...prev,
                [key]: { status: 'error', deals: [], error: errorMessage(error) },
              }))
            }
          }
        }),
      )
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const deals = useMemo(() => PLATFORMS.flatMap((info) => platforms[info.key].deals), [platforms])

  const canLoadMore =
    platforms.steam.status === 'ready' &&
    platforms.epic.status === 'ready' &&
    (!exhausted.steam || !exhausted.epic)

  /** Steam·Epic 다음 페이지를 실시간으로 더 가져와요. (콘솔은 스냅샷이라 더 없어요) */
  const loadMore = useCallback(async () => {
    if (rate === null || isLoadingMore || !canLoadMore) return
    setIsLoadingMore(true)
    const titles = new Set(deals.map((deal) => deal.title.trim().toLowerCase()))

    try {
      for (const key of ['steam', 'epic'] as const) {
        if (exhausted[key]) continue
        try {
          const more = await loadMorePlatformDeals(key, moreCursor.current[key], titles, rate)
          if (more.length === 0) {
            setExhausted((prev) => ({ ...prev, [key]: true }))
            continue
          }
          moreCursor.current[key] += 1
          setPlatforms((prev) => ({
            ...prev,
            [key]: { ...prev[key], deals: [...prev[key].deals, ...more] },
          }))
        } catch (error) {
          console.warn(`[catalog] ${key} 더 불러오기 실패`, error)
          setExhausted((prev) => ({ ...prev, [key]: true }))
        }
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [rate, isLoadingMore, canLoadMore, deals, exhausted])

  const isLoading = PLATFORMS.some((info) => platforms[info.key].status === 'loading')
  const errors = PLATFORMS.filter((info) => platforms[info.key].status === 'error').map((info) => ({
    label: info.label,
    message: platforms[info.key].error ?? '',
  }))

  return { rate, deals, platforms, isLoading, errors, canLoadMore, isLoadingMore, loadMore }
}
