export type WebShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

/**
 * 휴대폰에서는 OS 공유 시트를, 지원하지 않는 브라우저에서는 클립보드 복사를 써요.
 * (웹 번들에는 토스 SDK를 넣지 않아서 미니앱의 share.ts 대신 이 파일을 써요)
 */
export async function shareOrCopy(data: { title: string; text?: string; url?: string }): Promise<WebShareOutcome> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  return copyText([data.text, data.url].filter(Boolean).join('\n'))
}

export async function copyText(text: string): Promise<WebShareOutcome> {
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
