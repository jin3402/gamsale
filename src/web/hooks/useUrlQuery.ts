import { useCallback, useEffect, useRef, useState } from 'react'
import { parseQuery, serializeQuery, type DealQuery } from '../data/query'

function readGameParam() {
  return new URLSearchParams(window.location.search).get('game')
}

/**
 * 검색 조건과 열려 있는 게임(?game=)을 주소창과 맞춰요.
 * 그래서 검색 결과나 게임 상세를 링크로 공유할 수 있고, 뒤로가기도 자연스럽게 동작해요.
 */
export function useUrlQuery() {
  const [query, setQueryState] = useState<DealQuery>(() => parseQuery(window.location.search))
  const [gameId, setGameIdState] = useState<string | null>(() => readGameParam())
  /** 상세를 열면서 기록을 하나 쌓았는지 — 닫을 때 뒤로가기로 되돌려요. */
  const pushedGameRef = useRef(false)

  useEffect(() => {
    const onPopState = () => {
      pushedGameRef.current = false
      setQueryState(parseQuery(window.location.search))
      setGameIdState(readGameParam())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setQuery = useCallback(
    (update: Partial<DealQuery>) => {
      const next = { ...query, ...update }
      setQueryState(next)
      // 타이핑할 때마다 기록이 쌓이지 않게 검색 조건은 replaceState로 바꿔요.
      window.history.replaceState(null, '', `${window.location.pathname}${serializeQuery(next, { game: gameId })}`)
    },
    [query, gameId],
  )

  const openGame = useCallback(
    (id: string) => {
      setGameIdState(id)
      pushedGameRef.current = true
      // 기록을 남겨서, 휴대폰 뒤로가기로 상세를 닫을 수 있게 해요.
      window.history.pushState(null, '', `${window.location.pathname}${serializeQuery(query, { game: id })}`)
    },
    [query],
  )

  const closeGame = useCallback(() => {
    if (pushedGameRef.current) {
      window.history.back()
      return
    }
    // 공유 링크로 바로 들어온 경우엔 되돌아갈 기록이 없어서 주소만 고쳐요.
    setGameIdState(null)
    window.history.replaceState(null, '', `${window.location.pathname}${serializeQuery(query)}`)
  }, [query])

  return { query, setQuery, gameId, openGame, closeGame }
}
