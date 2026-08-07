import { createContext, useContext, type ReactNode } from 'react'
import { useWishlist } from './useWishlist'

type WishlistContextValue = ReturnType<typeof useWishlist>

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const value = useWishlist()
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlistContext() {
  const value = useContext(WishlistContext)
  if (!value) {
    throw new Error('useWishlistContext는 WishlistProvider 안에서만 사용할 수 있어요.')
  }
  return value
}
