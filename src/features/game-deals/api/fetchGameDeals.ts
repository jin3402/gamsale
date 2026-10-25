import type { GameDeal, Platform } from '../types'
import { CHEAPSHARK_PAGES, DEAL_LIMIT, TOP_DEAL_POOL_SIZE } from './config'
import { fetchMoreSteamDeals, fetchPopularSteamDeals } from './steamClient'
import { fetchMoreEpicDeals, fetchPopularEpicDeals } from './epicClient'
import { getUsdKrwRate } from './exchangeRate'
import { mapCheapSharkDeal } from './mapDeal'
import { fetchNintendoDeals } from './nintendoClient'
import { fetchPlayStationDeals } from './playstationClient'
import { fetchXboxDeals } from './xboxClient'
import { shuffleForSession } from './sessionShuffle'

/**
 * 할인율 순으로 정렬하되, 상위 풀(`TOP_DEAL_POOL_SIZE`) 안에서는 세션마다 순서를 섞어요.
 * 그래야 항상 같은 게임만 맨 위에 노출되지 않고, 앱을 다시 열 때마다 상위권 게임이 바뀌어요.
 * (Steam/Epic/Xbox/PlayStation/Nintendo 등 모든 플랫폼에 동일하게 적용돼요.)
 */
function sortByDiscount(deals: GameDeal[]) {
  const sorted = [...deals].sort((a, b) => b.discountRate - a.discountRate)
  const topPool = sorted.slice(0, TOP_DEAL_POOL_SIZE)
  const rest = sorted.slice(TOP_DEAL_POOL_SIZE)
  return [...shuffleForSession(topPool), ...rest]
}

async function getSteamDeals(usdKrwRate: number): Promise<GameDeal[]> {
  const raw = await fetchPopularSteamDeals()
  return raw.map((deal) =>
    mapCheapSharkDeal(deal, usdKrwRate, {
      platform: 'Steam',
    }),
  )
}

async function getEpicDeals(usdKrwRate: number): Promise<GameDeal[]> {
  const raw = await fetchPopularEpicDeals()
  return raw.map((deal) =>
    mapCheapSharkDeal(deal, usdKrwRate, {
      platform: 'Epic Games',
    }),
  )
}

async function loadPlatformDeals(
  platform: Platform,
  usdKrwRate: number,
): Promise<GameDeal[]> {
  switch (platform) {
    case 'Steam':
      return getSteamDeals(usdKrwRate)
    case 'Epic Games':
      return getEpicDeals(usdKrwRate)
    case 'Nintendo Switch':
      return fetchNintendoDeals()
    case 'PlayStation':
      return fetchPlayStationDeals(usdKrwRate)
    case 'Xbox':
      return fetchXboxDeals(usdKrwRate)
  }
}

/**
 * Steam/Epic은 실시간 API (CheapShark).
 * Nintendo/PlayStation/Xbox는 토스 WebView CORS 때문에 빌드 스냅샷(+개발 시 프록시 실시간).
 *
 * 처음엔 화면에 필요한 만큼(DEAL_LIMIT)만 가져와요. 그 이상은 미리 연동해두지 않고,
 * 사용자가 '더보기'로 그 이상을 요청할 때만 `fetchMoreGameDeals`가 실시간으로 더 가져와요.
 */
export async function fetchGameDeals(platform: '전체' | Platform): Promise<GameDeal[]> {
  const usdKrwRate = await getUsdKrwRate()

  if (platform !== '전체') {
    const deals = await loadPlatformDeals(platform, usdKrwRate)
    return sortByDiscount(deals).slice(0, DEAL_LIMIT)
  }

  const merged: GameDeal[] = []

  const consoleResults = await Promise.allSettled([
    loadPlatformDeals('PlayStation', usdKrwRate),
    loadPlatformDeals('Xbox', usdKrwRate),
    loadPlatformDeals('Nintendo Switch', usdKrwRate),
  ])

  for (const result of consoleResults) {
    if (result.status === 'fulfilled') merged.push(...result.value)
    else console.warn('[deals] 콘솔 목록 로드 실패', result.reason)
  }

  try {
    merged.push(...(await loadPlatformDeals('Steam', usdKrwRate)))
  } catch (error) {
    console.warn('[deals] Steam 로드 실패', error)
  }

  try {
    merged.push(...(await loadPlatformDeals('Epic Games', usdKrwRate)))
  } catch (error) {
    console.warn('[deals] Epic 로드 실패', error)
  }

  if (merged.length === 0) {
    throw new Error(
      '할인 정보를 불러오지 못했어요. API 제한이라면 2~3분 뒤 다시 시도해 주세요.',
    )
  }

  return sortByDiscount(merged).slice(0, DEAL_LIMIT)
}

export interface LoadMoreCursor {
  steamPage: number
  epicPage: number
  steamExhausted: boolean
  epicExhausted: boolean
}

/** 처음 로드 때 Steam/Epic 페이지 0~(CHEAPSHARK_PAGES-1)을 이미 썼으니, 다음 요청은 그 이후 페이지부터예요. */
export function createInitialLoadMoreCursor(): LoadMoreCursor {
  return {
    steamPage: CHEAPSHARK_PAGES,
    epicPage: CHEAPSHARK_PAGES,
    steamExhausted: false,
    epicExhausted: false,
  }
}

/**
 * 콘솔(Xbox/PlayStation/Nintendo)은 토스 WebView CORS 때문에 빌드 스냅샷 크기가 한계라
 * 실시간으로 더 가져올 수 없어요. Steam/Epic만 CORS가 열려 있어 진짜 무한 로딩이 가능해요.
 */
export function canLoadMoreDeals(platform: '전체' | Platform, cursor: LoadMoreCursor): boolean {
  if (platform === 'Steam') return !cursor.steamExhausted
  if (platform === 'Epic Games') return !cursor.epicExhausted
  if (platform === '전체') return !cursor.steamExhausted || !cursor.epicExhausted
  return false
}

/**
 * 화면에 보여준 목록을 다 스크롤한 뒤에만 호출돼요. Steam/Epic의 다음 페이지를
 * 실시간으로 하나씩 더 가져와서 이미 보여준 목록에 이어붙여요.
 */
export async function fetchMoreGameDeals(
  platform: '전체' | Platform,
  existingTitles: ReadonlySet<string>,
  cursor: LoadMoreCursor,
): Promise<{ deals: GameDeal[]; cursor: LoadMoreCursor }> {
  const wantsSteam = (platform === '전체' || platform === 'Steam') && !cursor.steamExhausted
  const wantsEpic = (platform === '전체' || platform === 'Epic Games') && !cursor.epicExhausted

  if (!wantsSteam && !wantsEpic) {
    return { deals: [], cursor }
  }

  const usdKrwRate = await getUsdKrwRate()
  const nextCursor: LoadMoreCursor = { ...cursor }
  const collected: GameDeal[] = []

  if (wantsSteam) {
    try {
      const raw = await fetchMoreSteamDeals(cursor.steamPage, existingTitles)
      if (raw.length === 0) {
        nextCursor.steamExhausted = true
      } else {
        nextCursor.steamPage = cursor.steamPage + 1
        collected.push(...raw.map((deal) => mapCheapSharkDeal(deal, usdKrwRate, { platform: 'Steam' })))
      }
    } catch (error) {
      console.warn('[deals] Steam 추가 로드 실패', error)
      nextCursor.steamExhausted = true
    }
  }

  if (wantsEpic) {
    try {
      const raw = await fetchMoreEpicDeals(cursor.epicPage, existingTitles)
      if (raw.length === 0) {
        nextCursor.epicExhausted = true
      } else {
        nextCursor.epicPage = cursor.epicPage + 1
        collected.push(
          ...raw.map((deal) => mapCheapSharkDeal(deal, usdKrwRate, { platform: 'Epic Games' })),
        )
      }
    } catch (error) {
      console.warn('[deals] Epic 추가 로드 실패', error)
      nextCursor.epicExhausted = true
    }
  }

  return { deals: [...collected].sort((a, b) => b.discountRate - a.discountRate), cursor: nextCursor }
}
