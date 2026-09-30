/**
 * 닌텐도(및 필요 시 콘솔) 목록에서 성인·선정성·저품질 게임을 걸러요.
 * 규칙 자체는 스냅샷 스크립트와 공유하는 contentRules.js에 있어요.
 */
import { isBlockedNintendoTitle } from './contentRules.js'

export { isBlockedNintendoTitle }

/** 닌텐도 딜 배열에서 차단 제목을 제거해요. */
export function filterSafeNintendoDeals<T extends { title: string }>(deals: T[]): T[] {
  return deals.filter((deal) => !isBlockedNintendoTitle(deal.title))
}
