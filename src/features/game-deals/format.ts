/** 12345 → "12,345원" */
export function formatKrw(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

/** 할인 종료 시각(ISO 8601)을 "8/31 23:59까지"로 보여줘요. 값이 없거나 잘못됐으면 null이에요. */
export function formatEndsAt(value?: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${month}/${day} ${hours}:${minutes}까지`
}
