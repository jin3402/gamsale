/**
 * 토스 네이티브 공유 시트를 우선 사용하고, 지원하지 않는 환경(일반 브라우저 등)에서는
 * Web Share API로 대체해요. 위시리스트 공유와 개별 게임 공유가 동일한 동작을 하도록
 * 이 모듈 하나로 통일해요.
 */
async function tryTossShare(message: string) {
  try {
    const mod = (await import('@apps-in-toss/web-framework')) as {
      share?: (options: { message: string }) => Promise<void>
    }
    if (typeof mod.share === 'function') {
      await mod.share({ message })
      return true
    }
  } catch {
    // 토스 환경이 아니면 무시하고 다음 방법으로 넘어가요.
  }
  return false
}

/** 네이티브 공유 시트를 열어요. 어떤 환경에서도 지원하지 않으면 예외를 던져요. */
export async function shareMessage(message: string, title?: string) {
  if (await tryTossShare(message)) return

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share({ title, text: message })
    return
  }

  throw new Error('이 환경에서는 공유를 사용할 수 없어요.')
}
