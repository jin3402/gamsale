import { cheapSharkJson } from '../../features/game-deals/api/cheapSharkRequest'
import type { CheapSharkDeal } from '../../features/game-deals/api/cheapSharkTypes'
import { EPIC_STORE_ID, STEAM_STORE_ID } from '../../features/game-deals/api/config'
import { mapCheapSharkDeal } from '../../features/game-deals/api/mapDeal'
import { isAdultContent } from './contentFilter'
import type { WebDeal } from './types'

/** /deals 응답에는 미니앱 타입에 없는 필드도 들어 있어요. 웹에서는 정렬·상세에 써요. */
export interface CheapSharkDealExtended extends CheapSharkDeal {
  metacriticScore?: string
  releaseDate?: number
}

export interface CheapSharkDealDetail {
  gameInfo: {
    storeID: string
    gameID: string
    name: string
    steamAppID: string | null
    salePrice: string
    retailPrice: string
    steamRatingText: string | null
    steamRatingPercent: string
    steamRatingCount: string
    metacriticScore: string
    releaseDate: number
    publisher: string
    thumb: string
  }
  cheaperStores: { dealID: string; storeID: string; salePrice: string; retailPrice: string }[]
  cheapestPrice: { price: string; date: number } | null
}

/** CheapShark 스토어 ID → 이름 (활성 스토어만) */
export const CHEAPSHARK_STORE_NAMES: Record<string, string> = {
  '1': 'Steam',
  '2': 'GamersGate',
  '3': 'GreenManGaming',
  '7': 'GOG',
  '11': 'Humble Store',
  '13': 'Ubisoft Store',
  '15': 'Fanatical',
  '21': 'WinGameStore',
  '23': 'GameBillet',
  '25': 'Epic Games Store',
  '27': 'Gamesplanet',
  '28': 'Gamesload',
  '30': 'IndieGala',
  '35': 'DreamGame',
}

function positiveNumber(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function steamHeader(appId: string) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
}

/**
 * Steam·Epic 딜만 WebDeal로 바꿔요. 다른 스토어 딜이나 성인·선정성 게임은 null.
 * 목록·검색·더 불러오기·공유 링크가 모두 여기를 거쳐서, 필터도 한 곳에서 걸려요.
 */
export function toWebDeal(deal: CheapSharkDealExtended, usdKrwRate: number): WebDeal | null {
  const platform =
    deal.storeID === STEAM_STORE_ID ? 'Steam' : deal.storeID === EPIC_STORE_ID ? 'Epic Games' : null
  if (!platform || isAdultContent(deal.title)) return null

  const base = mapCheapSharkDeal(deal, usdKrwRate, { platform })
  return {
    ...base,
    // 에픽 썸네일은 해상도가 낮아서, 스팀에도 있는 게임이면 스팀 헤더 이미지를 써요.
    thumbnailUrl: deal.steamAppID ? steamHeader(deal.steamAppID) : base.thumbnailUrl,
    source: 'cheapshark',
    cheapSharkDealId: deal.dealID,
    usdSalePrice: Number(deal.salePrice),
    usdNormalPrice: Number(deal.normalPrice),
    steamRatingPercent: positiveNumber(deal.steamRatingPercent),
    steamRatingCount: positiveNumber(deal.steamRatingCount),
    steamRatingText: deal.steamRatingText ?? undefined,
    metacriticScore: positiveNumber(deal.metacriticScore),
    releaseDate: positiveNumber(deal.releaseDate),
  }
}

/** 제목으로 Steam·Epic 딜을 검색해요. (정가 게임도 함께 와요 — 할인 여부는 화면에서 걸러요) */
export async function searchCheapShark(query: string, usdKrwRate: number): Promise<WebDeal[]> {
  const params = new URLSearchParams({
    title: query,
    storeID: `${STEAM_STORE_ID},${EPIC_STORE_ID}`,
    pageSize: '60',
  })
  const raw = await cheapSharkJson<CheapSharkDealExtended[]>(`/deals?${params.toString()}`)
  return raw.map((deal) => toWebDeal(deal, usdKrwRate)).filter((deal): deal is WebDeal => deal !== null)
}

/** 딜 상세 — 역대 최저가, 다른 스토어 가격, 평점 등을 가져와요. */
export function fetchDealDetail(cheapSharkDealId: string): Promise<CheapSharkDealDetail> {
  return cheapSharkJson<CheapSharkDealDetail>(`/deals?id=${cheapSharkDealId}`)
}

/** 공유 링크(?game=...)로 들어왔는데 목록에 없는 딜을 상세 응답으로 복원해요. */
export function webDealFromDetail(
  cheapSharkDealId: string,
  detail: CheapSharkDealDetail,
  usdKrwRate: number,
): WebDeal | null {
  const info = detail.gameInfo
  const sale = Number(info.salePrice)
  const retail = Number(info.retailPrice)
  return toWebDeal(
    {
      dealID: cheapSharkDealId,
      gameID: info.gameID,
      title: info.name,
      storeID: info.storeID,
      salePrice: info.salePrice,
      normalPrice: info.retailPrice,
      savings: retail > 0 ? String((1 - sale / retail) * 100) : '0',
      isOnSale: sale < retail ? '1' : '0',
      steamAppID: info.steamAppID,
      thumb: info.thumb,
      steamRatingCount: info.steamRatingCount,
      steamRatingPercent: info.steamRatingPercent,
      steamRatingText: info.steamRatingText,
      metacriticScore: info.metacriticScore,
      releaseDate: info.releaseDate,
    },
    usdKrwRate,
  )
}

/** CheapShark 리디렉트 링크 — 다른 스토어 가격으로 이동할 때 써요. */
export function cheapSharkRedirectUrl(dealId: string) {
  return `https://www.cheapshark.com/redirect?dealID=${dealId}`
}
