import type { WebDeal } from './data/types'

export function formatKrw(value: number) {
  if (value === 0) return '무료'
  return `${value.toLocaleString('ko-KR')}원`
}

export function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

/** 스팀·에픽 가격은 미국 스토어 USD를 환산한 값이라 '≈'를 붙여요. */
export function formatDealPrice(deal: WebDeal, value: number) {
  const text = formatKrw(value)
  return deal.source === 'cheapshark' && value > 0 ? `≈ ${text}` : text
}

export function formatDate(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatCount(value: number) {
  return value.toLocaleString('ko-KR')
}
