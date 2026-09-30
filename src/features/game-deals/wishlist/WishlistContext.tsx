import type { ReactNode } from 'react'
import { useWishlist } from './useWishlist'
import { WishlistContext } from './useWishlistContext'

export function WishlistProvider({ children }: { children: ReactNode }) {
  const value = useWishlist()
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}
