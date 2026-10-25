import { describe, expect, it } from 'vitest'
import {
  getNintendoSnapshotDeals,
  getPlayStationSnapshotDeals,
  getXboxSnapshotDeals,
} from './consoleSnapshots'
import { isBlockedNintendoTitle } from './contentRules.js'

const HTML_ENTITY = /&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/i

describe('콘솔 스냅샷', () => {
  it('닌텐도 제목에 HTML 엔티티가 남아 있지 않다', () => {
    const titles = getNintendoSnapshotDeals().map((deal) => deal.title)
    expect(titles.length).toBeGreaterThan(0)
    expect(titles.filter((title) => HTML_ENTITY.test(title))).toEqual([])
  })

  it('닌텐도 스냅샷에 차단 대상 제목이 없다', () => {
    expect(getNintendoSnapshotDeals().filter((deal) => isBlockedNintendoTitle(deal.title))).toEqual([])
  })

  it('플랫폼별로 할인율 내림차순이다', () => {
    const platforms = [getNintendoSnapshotDeals(), getPlayStationSnapshotDeals(), getXboxSnapshotDeals()]
    for (const deals of platforms) {
      const rates = deals.map((deal) => deal.discountRate)
      expect(rates).toEqual([...rates].sort((a, b) => b - a))
    }
  })

  it('호출할 때마다 새 배열을 돌려줘서 호출한 쪽이 바꿔도 캐시가 오염되지 않는다', () => {
    const first = getNintendoSnapshotDeals()
    first.length = 0
    expect(getNintendoSnapshotDeals().length).toBeGreaterThan(0)
  })
})
