import { describe, expect, it } from 'vitest'
import { decodeHtmlEntities, isBlockedNintendoTitle } from './contentRules.js'
import { filterSafeNintendoDeals } from './contentFilter'

describe('decodeHtmlEntities', () => {
  it('닌텐도 스토어 HTML에서 넘어오는 엔티티를 문자로 바꾼다', () => {
    expect(decodeHtmlEntities('주디의 어드벤처 DX (Judy&#039;s Adventure DX)')).toBe(
      "주디의 어드벤처 DX (Judy's Adventure DX)",
    )
    expect(decodeHtmlEntities('Frost &amp; Flora')).toBe('Frost & Flora')
    expect(decodeHtmlEntities('&quot;A&quot; &lt;B&gt; &#x27;C&#x27;')).toBe(`"A" <B> 'C'`)
  })

  it('엔티티가 아닌 &는 그대로 둔다', () => {
    expect(decodeHtmlEntities('Mortal Kombat 11 Ultimate PS4 & PS5')).toBe(
      'Mortal Kombat 11 Ultimate PS4 & PS5',
    )
    expect(decodeHtmlEntities('&unknown;')).toBe('&unknown;')
  })

  it('한 번만 디코딩한다', () => {
    expect(decodeHtmlEntities('&amp;#039;')).toBe('&#039;')
  })
})

describe('isBlockedNintendoTitle', () => {
  it('선정성 키워드가 들어간 제목을 막는다', () => {
    expect(isBlockedNintendoTitle('Hentai Puzzle')).toBe(true)
    expect(isBlockedNintendoTitle('성인용 게임')).toBe(true)
  })

  it('스냅샷 스크립트와 같은 규칙을 쓴다 (예전 런타임 규칙은 Sex\\b라 Sexy를 놓쳤다)', () => {
    expect(isBlockedNintendoTitle('Sexy Beach')).toBe(true)
  })

  it('저품질 목록(퀴즈·직소 등)을 막는다', () => {
    expect(isBlockedNintendoTitle('Jigsaw Masterpieces')).toBe(true)
    expect(isBlockedNintendoTitle('상식 배틀 퀴즈')).toBe(true)
  })

  it('엔티티가 섞인 제목도 디코딩한 뒤 검사한다', () => {
    expect(isBlockedNintendoTitle('Girl&#039;s Maid Caf&eacute;')).toBe(true)
  })

  it('일반 게임은 통과시킨다', () => {
    expect(isBlockedNintendoTitle('젤다의 전설 티어스 오브 더 킹덤')).toBe(false)
    expect(isBlockedNintendoTitle('호그와트 레거시 Hogwarts Legacy')).toBe(false)
  })
})

describe('filterSafeNintendoDeals', () => {
  it('차단 제목만 제거하고 순서는 유지한다', () => {
    const deals = [{ title: 'Mario' }, { title: 'NSFW Pack' }, { title: 'Kirby' }]
    expect(filterSafeNintendoDeals(deals)).toEqual([{ title: 'Mario' }, { title: 'Kirby' }])
  })
})
