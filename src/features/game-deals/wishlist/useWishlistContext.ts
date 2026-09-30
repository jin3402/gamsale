import { createContext, useContext } from 'react'
import type { useWishlist } from './useWishlist'

export type WishlistContextValue = ReturnType<typeof useWishlist>

export const WishlistContext = createContext<WishlistContextValue | null>(null)

export function useWishlistContext() {
  const value = useContext(WishlistContext)
  if (!value) {
    throw new Error('useWishlistContext는 WishlistProvider 안에서만 사용할 수 있어요.')
  }
  return value
}
