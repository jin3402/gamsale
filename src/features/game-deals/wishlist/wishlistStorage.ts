import { resolveStoreUrl } from '../api/storeUrl'
import type { GameDeal } from '../types'

const STORAGE_KEY = 'game-deal-alert:wishlist:v1'

export function loadWishlist(): GameDeal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isGameDeal).map((deal) => ({
      ...deal,
      dealUrl: resolveStoreUrl(deal),
    }))
  } catch {
    return []
  }
}

export function saveWishlist(deals: GameDeal[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals))
  } catch {
    // quota / private mode
  }
}

function isGameDeal(value: unknown): value is GameDeal {
  if (!value || typeof value !== 'object') return false
  const deal = value as GameDeal
  return (
    typeof deal.id === 'string' &&
    typeof deal.title === 'string' &&
    typeof deal.platform === 'string' &&
    typeof deal.salePrice === 'number' &&
    typeof deal.discountRate === 'number'
  )
}
