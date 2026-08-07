import type { GameDeal } from '../types'
import { filterSafeNintendoDeals } from './contentFilter'
import { consoleDealSnapshot } from './snapshots/consoleDeals'

export function canFetchNintendoLive() {
  return import.meta.env.DEV || import.meta.env.VITE_USE_NINTENDO_PROXY === 'true'
}

export function canFetchPlayStationLive() {
  return import.meta.env.DEV || import.meta.env.VITE_USE_PLAYSTATION_PROXY === 'true'
}

export function canFetchXboxLive() {
  return import.meta.env.DEV || import.meta.env.VITE_USE_XBOX_PROXY === 'true'
}

function sortByDiscount(deals: GameDeal[]) {
  return [...deals].sort((a, b) => b.discountRate - a.discountRate)
}

export function getNintendoSnapshotDeals(): GameDeal[] {
  // 빌드 스냅샷에 성인·선정성 게임이 섞여 있어도 런타임에서 한 번 더 걸러요.
  return sortByDiscount(filterSafeNintendoDeals(consoleDealSnapshot.nintendo ?? []))
}

export function getPlayStationSnapshotDeals(): GameDeal[] {
  return sortByDiscount(consoleDealSnapshot.playstation ?? [])
}

export function getXboxSnapshotDeals(): GameDeal[] {
  return sortByDiscount(consoleDealSnapshot.xbox ?? [])
}
