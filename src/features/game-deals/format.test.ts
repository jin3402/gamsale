import { describe, expect, it } from 'vitest'
import { formatEndsAt, formatKrw } from './format'

describe('formatKrw', () => {
  it('천 단위 구분 기호와 "원"을 붙인다', () => {
    expect(formatKrw(1234567)).toBe('1,234,567원')
    expect(formatKrw(0)).toBe('0원')
  })
})

describe('formatEndsAt', () => {
  it('로컬 시간 기준 "월/일 시:분까지"로 보여준다', () => {
    const endsAt = new Date(2026, 7, 31, 9, 5).toISOString()
    expect(formatEndsAt(endsAt)).toBe('8/31 09:05까지')
  })

  it('값이 없거나 날짜가 아니면 null', () => {
    expect(formatEndsAt(undefined)).toBeNull()
    expect(formatEndsAt('')).toBeNull()
    expect(formatEndsAt('not-a-date')).toBeNull()
  })
})
