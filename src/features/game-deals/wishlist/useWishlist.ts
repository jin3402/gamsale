import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameDeal } from '../types'
import { loadWishlist, saveWishlist } from './wishlistStorage'

export function useWishlist() {
  const [items, setItems] = useState<GameDeal[]>(() => loadWishlist())

  useEffect(() => {
    saveWishlist(items)
  }, [items])

  const ids = useMemo(() => new Set(items.map((item) => item.id)), [items])

  const has = useCallback((id: string) => ids.has(id), [ids])

  const toggle = useCallback((deal: GameDeal) => {
    setItems((prev) => {
      const exists = prev.some((item) => item.id === deal.id)
      if (exists) return prev.filter((item) => item.id !== deal.id)
      return [deal, ...prev]
    })
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  return { items, ids, has, toggle, remove, clear, count: items.length }
}
