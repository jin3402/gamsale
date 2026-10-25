import { useEffect, useState } from 'react'
import { searchCheapShark } from '../data/cheapshark'
import type { WebDeal } from '../data/types'

interface SearchState {
  query: string
  status: 'idle' | 'loading' | 'ready' | 'error'
  deals: WebDeal[]
  error?: string
}

const SEARCH_DEBOUNCE_MS = 450

/**
 * 검색어가 바뀌면 잠깐 기다렸다가 CheapShark에서 Steam·Epic 게임을 검색해요.
 * 이미 불러온 할인 목록(콘솔 포함)은 화면에서 바로 거르고, 여기서는 목록에 없는 게임을 보충해요.
 */
export function useCheapSharkSearch(query: string, usdKrwRate: number | null) {
  const trimmed = query.trim()
  const [state, setState] = useState<SearchState>({ query: '', status: 'idle', deals: [] })

  useEffect(() => {
    if (trimmed.length < 2 || usdKrwRate === null) return

    let cancelled = false
    const timer = window.setTimeout(() => {
      setState({ query: trimmed, status: 'loading', deals: [] })
      searchCheapShark(trimmed, usdKrwRate)
        .then((deals) => {
          if (!cancelled) setState({ query: trimmed, status: 'ready', deals })
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setState({
            query: trimmed,
            status: 'error',
            deals: [],
            error: error instanceof Error ? error.message : '검색하지 못했어요.',
          })
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [trimmed, usdKrwRate])

  // 검색어가 바뀐 직후(디바운스 대기 중)에는 이전 검색 결과를 쓰지 않아요.
  if (state.query !== trimmed) {
    return { status: trimmed.length >= 2 ? ('loading' as const) : ('idle' as const), deals: [], error: undefined }
  }
  return state
}
