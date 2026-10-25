import { fetchMoreSteamDeals, fetchPopularSteamDeals } from '../../features/game-deals/api/steamClient'
import { CHEAPSHARK_PAGES } from '../../features/game-deals/api/config'
import { fetchMoreEpicDeals, fetchPopularEpicDeals } from '../../features/game-deals/api/epicClient'
import { fetchNintendoDeals } from '../../features/game-deals/api/nintendoClient'
import { fetchPlayStationDeals } from '../../features/game-deals/api/playstationClient'
import { fetchXboxDeals } from '../../features/game-deals/api/xboxClient'
import type { GameDeal } from '../../features/game-deals/types'
import { toWebDeal, type CheapSharkDealExtended } from './cheapshark'
import { isAdultContent } from './contentFilter'
import type { PlatformKey, WebDeal } from './types'

export { consoleDealSnapshot } from '../../features/game-deals/api/snapshots/consoleDeals'

/** Steam·Epic은 처음에 CHEAPSHARK_PAGES 페이지를 받아요. 더 불러오기는 그 다음 페이지부터예요. */
export const FIRST_MORE_PAGE = CHEAPSHARK_PAGES

function fromCheapShark(raw: CheapSharkDealExtended[], usdKrwRate: number) {
  return raw.map((deal) => toWebDeal(deal, usdKrwRate)).filter((deal): deal is WebDeal => deal !== null)
}

/** 닌텐도 스토어 HTML에서 긁어온 제목에 남은 &#039; 같은 엔티티를 글자로 바꿔요. */
function decodeEntities(title: string) {
  return title
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** 콘솔 스냅샷 — 성인·선정성 게임은 빼요. (Steam·Epic은 toWebDeal에서 걸러요) */
function fromSnapshot(deals: GameDeal[]): WebDeal[] {
  return deals
    .filter((deal) => !isAdultContent(deal.title))
    .map((deal) => ({ ...deal, title: decodeEntities(deal.title), source: 'snapshot' }))
}

/**
 * 플랫폼별 할인 목록. 미니앱과 같은 데이터 로직을 그대로 써요.
 * - Steam·Epic: CheapShark 실시간
 * - PlayStation·Xbox·Switch: 빌드할 때 만든 스냅샷 (스토어 API가 브라우저 CORS를 막아요)
 */
export async function loadPlatformDeals(key: PlatformKey, usdKrwRate: number): Promise<WebDeal[]> {
  switch (key) {
    case 'steam':
      return fromCheapShark(await fetchPopularSteamDeals(), usdKrwRate)
    case 'epic':
      return fromCheapShark(await fetchPopularEpicDeals(), usdKrwRate)
    case 'ps':
      return fromSnapshot(await fetchPlayStationDeals(usdKrwRate))
    case 'xbox':
      return fromSnapshot(await fetchXboxDeals(usdKrwRate))
    case 'switch':
      return fromSnapshot(await fetchNintendoDeals())
  }
}

/** Steam·Epic 다음 페이지. 빈 배열이면 더 없어요. */
export async function loadMorePlatformDeals(
  key: 'steam' | 'epic',
  page: number,
  existingTitles: ReadonlySet<string>,
  usdKrwRate: number,
): Promise<WebDeal[]> {
  const raw =
    key === 'steam'
      ? await fetchMoreSteamDeals(page, existingTitles)
      : await fetchMoreEpicDeals(page, existingTitles)
  return fromCheapShark(raw, usdKrwRate)
}
