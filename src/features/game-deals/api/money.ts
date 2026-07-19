/** "$19.99" / "1,299" 같은 표시 문자열에서 숫자만 추출해요. */
export function parseMoneyAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const match = value.replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/)
  if (!match) return null

  const amount = Number(match[1])
  return Number.isFinite(amount) ? amount : null
}

export function toKrw(amount: number, rate: number) {
  return Math.round(amount * rate)
}

export function discountPercent(original: number, sale: number) {
  if (original <= 0 || sale < 0 || sale >= original) return 0
  return Math.round((1 - sale / original) * 100)
}
