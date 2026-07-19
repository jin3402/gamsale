import { useEffect, useState } from 'react'
import { fetchGameDeals } from './api/fetchGameDeals'
import type { GameDeal, Platform, SortOption } from './types'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function useGameDeals(platform: '전체' | Platform, sort: SortOption) {
  const [deals, setDeals] = useState<GameDeal[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function load() {
      setStatus('loading')
      setErrorMessage(null)

      try {
        const next = await fetchGameDeals(platform, sort)
        if (cancelled) return
        setDeals(next)
        setStatus('success')
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
      controller.abort()
    }
  }, [platform, sort, reloadKey])

  return {
    deals,
    status,
    errorMessage,
    isLoading: status === 'loading' || status === 'idle',
    reload: () => setReloadKey((key) => key + 1),
  }
}
