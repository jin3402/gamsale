import { isTossApp } from './tossEnvironment'

/**
 * 토스 네이티브 공유 시트를 우선 사용하고, 지원하지 않는 환경(일반 브라우저 등)에서는
 * Web Share API로 대체해요. Web Share API도 없는 데스크톱 브라우저에서는 클립보드로 복사해요.
 * 위시리스트 공유와 개별 게임 공유가 동일한 동작을 하도록 이 모듈 하나로 통일해요.
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

export type ShareOutcome = 'shared' | 'copied'

/** 공유 시트를 열거나 클립보드로 복사해요. 어떤 방법도 쓸 수 없으면 예외를 던져요. */
export async function shareMessage(message: string, title?: string): Promise<ShareOutcome> {
  // 일반 웹에서는 토스 공유를 건너뛰어요. 앞에서 await가 길어지면
  // 사파리가 사용자 탭으로 인정하지 않아 navigator.share가 막혀요.
  if (isTossApp() && (await tryTossShare(message))) return 'shared'

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share({ title, text: message })
    return 'shared'
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(message)
    return 'copied'
  }

  throw new Error('이 환경에서는 공유를 사용할 수 없어요.')
}
