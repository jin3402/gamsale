import type { GameDeal, Platform, SortOption } from '../types'
import { DEAL_LIMIT } from './config'
import { fetchPopularSteamDeals } from './cheapSharkClient'
import { fetchPopularEpicDeals } from './epicClient'
import { getUsdKrwRate } from './exchangeRate'
import { mapCheapSharkDeal } from './mapDeal'
import { fetchNintendoDeals } from './nintendoClient'
import { fetchPlayStationDeals } from './playstationClient'
import { fetchXboxDeals } from './xboxClient'

function sortDeals(deals: GameDeal[], sort: SortOption) {
  const next = [...deals]

  if (sort === 'discount') {
    return next.sort((a, b) => b.discountRate - a.discountRate)
  }

  return next.sort((a, b) => {
    if (a.isHistoricalLow !== b.isHistoricalLow) {
      return a.isHistoricalLow ? -1 : 1
    }
    return b.discountRate - a.discountRate
  })
}

async function getSteamDeals(sort: SortOption, usdKrwRate: number): Promise<GameDeal[]> {
  const raw = await fetchPopularSteamDeals(sort)
  // 추가 /games 호출 없이 목록만 구성 (rate limit 방지)
  return raw.map((deal) =>
    mapCheapSharkDeal(deal, usdKrwRate, {
      platform: 'Steam',
      isHistoricalLow: false,
    }),
  )
}

async function getEpicDeals(sort: SortOption, usdKrwRate: number): Promise<GameDeal[]> {
  const raw = await fetchPopularEpicDeals(sort)
  return raw.map((deal) =>
    mapCheapSharkDeal(deal, usdKrwRate, {
      platform: 'Epic Games',
      isHistoricalLow: false,
    }),
  )
}

async function loadPlatformDeals(
  platform: Platform,
  sort: SortOption,
  usdKrwRate: number,
): Promise<GameDeal[]> {
  switch (platform) {
    case 'Steam':
      return getSteamDeals(sort, usdKrwRate)
    case 'Epic Games':
      return getEpicDeals(sort, usdKrwRate)
    case 'Nintendo Switch':
      return fetchNintendoDeals(sort)
    case 'PlayStation':
      return fetchPlayStationDeals(sort, usdKrwRate)
    case 'Xbox':
      return fetchXboxDeals(sort, usdKrwRate)
  }
}

/**
 * 실시간 API만 사용해요. Mock 폴백 없음.
 * CheapShark는 스토어당 최대 1회(+10분 캐시)로 호출해요.
 */
export async function fetchGameDeals(
  platform: '전체' | Platform,
  sort: SortOption,
): Promise<GameDeal[]> {
  const usdKrwRate = await getUsdKrwRate()

  if (platform !== '전체') {
    const deals = await loadPlatformDeals(platform, sort, usdKrwRate)
    return sortDeals(deals, sort).slice(0, DEAL_LIMIT)
  }

  // 콘솔 스토어는 병렬, CheapShark(Steam/Epic)만 순차 1회씩
  const merged: GameDeal[] = []

  const consoleResults = await Promise.allSettled([
    loadPlatformDeals('PlayStation', sort, usdKrwRate),
    loadPlatformDeals('Xbox', sort, usdKrwRate),
    loadPlatformDeals('Nintendo Switch', sort, usdKrwRate),
  ])

  for (const result of consoleResults) {
    if (result.status === 'fulfilled') merged.push(...result.value)
    else console.warn('[deals] 콘솔 목록 로드 실패', result.reason)
  }

  try {
    merged.push(...(await loadPlatformDeals('Steam', sort, usdKrwRate)))
  } catch (error) {
    console.warn('[deals] Steam 로드 실패', error)
  }

  try {
    merged.push(...(await loadPlatformDeals('Epic Games', sort, usdKrwRate)))
  } catch (error) {
    console.warn('[deals] Epic 로드 실패', error)
  }

  if (merged.length === 0) {
    throw new Error(
      '할인 정보를 불러오지 못했어요. API 제한이라면 2~3분 뒤 다시 시도해 주세요.',
    )
  }

  return sortDeals(merged, sort).slice(0, DEAL_LIMIT)
}
