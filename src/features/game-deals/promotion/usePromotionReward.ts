import { useCallback, useEffect, useRef } from 'react'
import { grantPromotionReward } from '@apps-in-toss/web-framework'

/**
 * "서비스 이용하고 5원 받기" 프로모션의 콘솔 테스트용 코드예요.
 * 실제 프로모션을 시작하기 전, 토스 앱(QR 코드 테스트)에서 이 코드로 최소 1회 호출해야
 * 콘솔에서 프로모션을 "시작" 상태로 전환할 수 있어요. (샌드박스 앱에서는 호출해도 인정되지 않아요.)
 */
export const TEST_PROMOTION_CODE = 'TEST_01KYXDCDG35QD4EYTZ8R9M2J1B'

/**
 * 콘솔에서 프로모션 검수가 끝난 뒤 발급되는 "운영용" 프로모션 코드예요. (TEST_ 접두사 없는 코드)
 * 콘솔에서 "시작하기"를 누르기 직전, 이 값을 false로 바꾼 뒤 다시 빌드해 주세요.
 */
export const PRODUCTION_PROMOTION_CODE = '01KYXDCDG35QD4EYTZ8R9M2J1B'

/** 앱 진입(서비스 이용) 시 지급할 포인트(원) 금액이에요. */
export const ENTRY_PROMOTION_AMOUNT = 5

/**
 * true인 동안에는 항상 TEST_ 코드로 호출해요.
 *
 * 주의: `npm run build`로 만든 .ait는 QR 코드 테스트와 실제 배포 모두 "운영 빌드"라서
 * `import.meta.env.DEV`로는 두 상황을 구분할 수 없어요. 그래서 아래 플래그로 직접 전환해요.
 *
 * 1) 지금처럼 true인 상태로 빌드 → QR 코드 테스트에서 앱 진입 1회 → 콘솔에 성공 기록 확인
 * 2) 콘솔에서 "시작하기"를 누르기 전, 이 값을 false로 바꾼 뒤 다시 빌드해서 그 .ait로 재배포해 주세요.
 */
const IS_PROMOTION_TEST_PHASE = true

const DEFAULT_PROMOTION_CODE = IS_PROMOTION_TEST_PHASE ? TEST_PROMOTION_CODE : PRODUCTION_PROMOTION_CODE

const STORAGE_KEY_PREFIX = 'game-deal-alert:promotion-reward:'

export type GrantPromotionRewardOutcome =
  | { status: 'granted'; key: string }
  | { status: 'already-granted' }
  | { status: 'unsupported' }
  | { status: 'error'; errorCode?: string; message?: string }

/**
 * 기기(브라우저) 전체에서 공유되는 요청 중복 방지 플래그예요.
 * 같은 세션에서 여러 번 진입해도 "기기당 1회"가 지켜지도록 모듈 스코프에 둬요.
 */
const inFlightRequests = new Set<string>()

/**
 * 프로모션 포인트를 "기기당 1회만" 지급해요.
 * 앱에 들어오면 한 번 호출하고, 이미 지급한 적이 있으면 다시 호출하지 않아요.
 */
export async function grantEntryPromotionReward(
  promotionCode: string = DEFAULT_PROMOTION_CODE,
  amount = ENTRY_PROMOTION_AMOUNT,
): Promise<GrantPromotionRewardOutcome> {
  const storageKey = `${STORAGE_KEY_PREFIX}${promotionCode}`

  if (typeof window !== 'undefined' && window.localStorage.getItem(storageKey)) {
    return { status: 'already-granted' }
  }

  if (inFlightRequests.has(storageKey)) {
    return { status: 'already-granted' }
  }

  inFlightRequests.add(storageKey)
  try {
    const result = await grantPromotionReward({ params: { promotionCode, amount } })

    if (!result) {
      console.warn('[프로모션] 지원하지 않는 앱 버전이에요.')
      return { status: 'unsupported' }
    }

    if (result === 'ERROR') {
      console.error('[프로모션] 포인트 지급 중 알 수 없는 오류가 발생했어요.')
      return { status: 'error' }
    }

    if ('key' in result) {
      console.log('[프로모션] 포인트 지급 성공:', result.key)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, result.key)
      }
      return { status: 'granted', key: result.key }
    }

    console.error('[프로모션] 포인트 지급 실패:', result.errorCode, result.message)
    return { status: 'error', errorCode: result.errorCode, message: result.message }
  } catch (error) {
    console.error('[프로모션] 호출 중 예외가 발생했어요:', error)
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  } finally {
    inFlightRequests.delete(storageKey)
  }
}

/** 컴포넌트에서 편하게 쓸 수 있는 래퍼 훅이에요. 실제 지급 로직은 `grantEntryPromotionReward`에 있어요. */
export function usePromotionReward(promotionCode: string = DEFAULT_PROMOTION_CODE, amount = ENTRY_PROMOTION_AMOUNT) {
  const grantOnce = useCallback(
    () => grantEntryPromotionReward(promotionCode, amount),
    [promotionCode, amount],
  )

  return { grantOnce }
}

/**
 * 앱에 처음 들어올 때 프로모션 지급을 한 번만 시도해요.
 * (공유와 무관하게 "서비스 이용" 조건으로 지급해요.)
 */
export function useEntryPromotionReward() {
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (attemptedRef.current) return
    attemptedRef.current = true
    void grantEntryPromotionReward()
  }, [])
}
