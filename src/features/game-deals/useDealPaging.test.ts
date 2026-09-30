import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDealPaging } from './useDealPaging'

describe('useDealPaging', () => {
  it('처음에는 한 페이지만 보여준다', () => {
    const { result } = renderHook(() => useDealPaging('전체:0', 10))
    expect(result.current.visibleCount).toBe(10)
  })

  it('더보기마다 한 페이지씩 늘리고 limit을 넘지 않는다', () => {
    const { result } = renderHook(() => useDealPaging('전체:0', 10))

    act(() => result.current.showMore(25))
    expect(result.current.visibleCount).toBe(20)

    act(() => result.current.showMore(25))
    expect(result.current.visibleCount).toBe(25)
  })

  it('원격 더보기로 목록이 길어져도 보던 개수를 유지한다', () => {
    // 이전 구현은 deals 배열이 바뀔 때마다 10개로 초기화해서,
    // 150개를 다 본 뒤 '더보기'를 누르면 목록이 10개로 줄어들었어요.
    const { result, rerender } = renderHook(({ listKey }) => useDealPaging(listKey, 10), {
      initialProps: { listKey: 'Steam:0' },
    })

    for (let i = 0; i < 14; i += 1) act(() => result.current.showMore(150))
    expect(result.current.visibleCount).toBe(150)

    rerender({ listKey: 'Steam:0' })
    act(() => result.current.showMore())
    expect(result.current.visibleCount).toBe(160)
  })

  it('플랫폼이 바뀌거나 다시 시도하면 처음 개수로 돌아간다', () => {
    const { result, rerender } = renderHook(({ listKey }) => useDealPaging(listKey, 10), {
      initialProps: { listKey: 'Steam:0' },
    })

    act(() => result.current.showMore())
    expect(result.current.visibleCount).toBe(20)

    rerender({ listKey: 'Xbox:0' })
    expect(result.current.visibleCount).toBe(10)

    act(() => result.current.showMore())
    rerender({ listKey: 'Xbox:1' })
    expect(result.current.visibleCount).toBe(10)
  })
})
