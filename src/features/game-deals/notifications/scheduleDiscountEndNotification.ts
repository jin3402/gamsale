import type { GameDeal } from '../types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface ScheduleDiscountEndNotificationParams {
  deal: GameDeal
  /** 할인 종료 N일 전 (기본 1일) */
  daysBeforeEnd?: number
}

export interface ScheduleDiscountEndNotificationResult {
  ok: boolean
  dealId: string
  /** 알림이 예약될 시각 (ISO) */
  notifyAt: string | null
  message: string
  /** 실제 서버/SDK 연동 전이라 더미 호출인지 여부 */
  dryRun: boolean
}

/** 로컬에서 예약된 알림을 추적해요. (서버 연동 전까지 사용) */
const scheduledNotificationIds = new Map<string, string>()

function getNotifyAt(endsAt: string, daysBeforeEnd: number) {
  const end = new Date(endsAt)
  if (Number.isNaN(end.getTime())) return null

  const notifyAt = new Date(end.getTime() - daysBeforeEnd * MS_PER_DAY)
  return notifyAt
}

/**
 * 위시리스트 추가 시 '할인 종료 1일 전' 푸시 알림을 스케줄링해요.
 *
 * 현재는 백엔드/스마트 발송 연동 전이라 더미 API로 동작합니다.
 * 실제 연동 시 이 함수 안에서 서버 스케줄 API 또는
 * Apps In Toss 기능성 메시지 API를 호출하면 됩니다.
 *
 * @see https://developers-apps-in-toss.toss.im/smart-message/intro.html
 */
export async function scheduleDiscountEndNotification({
  deal,
  daysBeforeEnd = 1,
}: ScheduleDiscountEndNotificationParams): Promise<ScheduleDiscountEndNotificationResult> {
  if (!deal.endsAt) {
    const result: ScheduleDiscountEndNotificationResult = {
      ok: false,
      dealId: deal.id,
      notifyAt: null,
      message: '할인 종료일이 없어 알림을 예약하지 않았어요.',
      dryRun: true,
    }
    console.info('[push:schedule:skip]', result)
    return result
  }

  const notifyAt = getNotifyAt(deal.endsAt, daysBeforeEnd)
  if (!notifyAt) {
    const result: ScheduleDiscountEndNotificationResult = {
      ok: false,
      dealId: deal.id,
      notifyAt: null,
      message: '할인 종료일 형식이 올바르지 않아요.',
      dryRun: true,
    }
    console.warn('[push:schedule:invalid-date]', result)
    return result
  }

  // 이미 지난 시점이면 예약하지 않아요.
  if (notifyAt.getTime() <= Date.now()) {
    const result: ScheduleDiscountEndNotificationResult = {
      ok: false,
      dealId: deal.id,
      notifyAt: notifyAt.toISOString(),
      message: '할인 종료 1일 전 시점이 이미 지나 알림을 예약하지 않았어요.',
      dryRun: true,
    }
    console.info('[push:schedule:past]', result)
    return result
  }

  // TODO: 실제 서버 API로 교체
  // await fetch('/api/notifications/schedule', { method: 'POST', body: JSON.stringify({...}) })
  await Promise.resolve()

  const scheduleId = `discount-end-${deal.id}-${notifyAt.getTime()}`
  scheduledNotificationIds.set(deal.id, scheduleId)

  const result: ScheduleDiscountEndNotificationResult = {
    ok: true,
    dealId: deal.id,
    notifyAt: notifyAt.toISOString(),
    message: `"${deal.title}" 할인 종료 ${daysBeforeEnd}일 전 알림을 예약했어요.`,
    dryRun: true,
  }

  console.info('[push:schedule]', {
    ...result,
    scheduleId,
    title: deal.title,
    endsAt: deal.endsAt,
    payload: {
      type: 'discount_ending_soon',
      dealId: deal.id,
      title: deal.title,
      platform: deal.platform,
      endsAt: deal.endsAt,
    },
  })

  return result
}

/**
 * 위시리스트에서 제거될 때 예약된 할인 종료 알림을 취소해요.
 */
export async function cancelDiscountEndNotification(
  dealId: string,
): Promise<{ ok: boolean; dealId: string; dryRun: boolean }> {
  const scheduleId = scheduledNotificationIds.get(dealId)

  // TODO: 실제 서버 API로 교체
  // await fetch(`/api/notifications/${scheduleId}`, { method: 'DELETE' })
  await Promise.resolve()

  scheduledNotificationIds.delete(dealId)

  const result = {
    ok: true,
    dealId,
    dryRun: true,
  }

  console.info('[push:cancel]', { ...result, scheduleId: scheduleId ?? null })
  return result
}
