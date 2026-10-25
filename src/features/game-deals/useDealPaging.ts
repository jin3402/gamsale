import { useCallback, useState } from 'react'
import { DEAL_PAGE_SIZE } from './api/config'

/**
 * 피드에 보여줄 게임 수를 관리해요.
 * 목록 자체가 새로 로드될 때(`listKey`가 바뀔 때: 플랫폼 변경, 다시 시도)만 처음 개수로 돌아가고,
 * '더보기'로 뒤에 이어붙인 경우에는 지금까지 보던 개수를 유지해요.
 */
export function useDealPaging(listKey: string, pageSize = DEAL_PAGE_SIZE) {
  const [paging, setPaging] = useState({ listKey, count: pageSize })
  const visibleCount = paging.listKey === listKey ? paging.count : pageSize

  /** 한 페이지만큼 더 보여줘요. `limit`을 넘기면 그 개수를 넘지 않아요. */
  const showMore = useCallback(
    (limit = Number.POSITIVE_INFINITY) => {
      setPaging((prev) => {
        const current = prev.listKey === listKey ? prev.count : pageSize
        return { listKey, count: Math.min(current + pageSize, limit) }
      })
    },
    [listKey, pageSize],
  )

  return { visibleCount, showMore }
}
