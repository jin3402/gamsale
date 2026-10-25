import { useEffect, useState } from 'react'
import { fetchDealDetail, type CheapSharkDealDetail } from '../data/cheapshark'

interface DetailState {
  dealId: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  detail?: CheapSharkDealDetail
}

/** CheapShark 딜이면 역대 최저가·다른 스토어 가격 같은 상세를 불러와요. */
export function useDealDetail(cheapSharkDealId: string | undefined) {
  const [state, setState] = useState<DetailState>({ dealId: null, status: 'idle' })

  useEffect(() => {
    if (!cheapSharkDealId) return
    let cancelled = false
    // 응답 전까지는 아래에서 dealId가 다르니 'loading'으로 보여요.
    fetchDealDetail(cheapSharkDealId)
      .then((detail) => {
        if (!cancelled) setState({ dealId: cheapSharkDealId, status: 'ready', detail })
      })
      .catch(() => {
        if (!cancelled) setState({ dealId: cheapSharkDealId, status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [cheapSharkDealId])

  if (!cheapSharkDealId) return { status: 'idle' as const, detail: undefined }
  if (state.dealId !== cheapSharkDealId) return { status: 'loading' as const, detail: undefined }
  return state
}
