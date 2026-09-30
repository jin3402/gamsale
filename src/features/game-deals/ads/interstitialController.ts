import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework'
import { LIVE_INTERSTITIAL_AD_GROUP_ID, TEST_INTERSTITIAL_AD_GROUP_ID } from './adIds'

/** 브릿지가 준비될 시간을 조금 주고 첫 로드를 시작해요. */
const BOOT_DELAY_MS = 100
const TEST_ID_FALLBACK_DELAY_MS = 300
const RETRY_BASE_DELAY_MS = 800
const MAX_RETRIES = 3
/** 광고가 끝내 안 떠도 다음 동작(스토어 이동 등)이 이 시간 넘게 막히지 않게 해요. */
export const SHOW_TIMEOUT_MS = 4000

function hasTossWebView() {
  try {
    return (
      typeof window !== 'undefined' &&
      Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView)
    )
  } catch {
    return false
  }
}

function isAdSupported() {
  try {
    if (typeof loadFullScreenAd.isSupported === 'function' && loadFullScreenAd.isSupported()) {
      return true
    }
  } catch {
    // 브릿지 준비 전일 수 있어요
  }
  // 토스 WebView면 isSupported가 false/예외여도 로드를 시도해요
  return hasTossWebView()
}

export interface InterstitialController {
  /** 첫 광고를 미리 로드하기 시작해요. */
  start: () => void
  /** 타이머와 로드 구독을 정리해요. */
  dispose: () => void
  /**
   * 전면 광고를 보여줘요. `onFinished`는 광고가 끝났을 때(닫힘/실패/미지원/시간 초과 포함) 한 번 호출돼요.
   * 광고를 바로 띄웠으면 true를 돌려줘요.
   */
  show: (onFinished?: () => void) => boolean
}

/**
 * 전면형 광고 수명주기: load → show → (닫히면) 다시 load.
 * 라이브 ID 로드가 실패하면 테스트 ID로 한 번 바꾸고, 그래도 실패하면 짧게 재시도해요.
 * React 상태를 쓰지 않는 순수 객체라 화면을 다시 그리지 않고, 테스트에서도 바로 다룰 수 있어요.
 */
export function createInterstitialController(): InterstitialController {
  let adGroupId = LIVE_INTERSTITIAL_AD_GROUP_ID
  let loading = false
  let loaded = false
  let showing = false
  let pendingShow = false
  let retryCount = 0
  let unregisterLoad: (() => void) | null = null
  let bootTimer: ReturnType<typeof setTimeout> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let finishTimer: ReturnType<typeof setTimeout> | null = null
  let onFinished: (() => void) | null = null

  function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
    if (timer) clearTimeout(timer)
    return null
  }

  function finish() {
    finishTimer = clearTimer(finishTimer)
    const callback = onFinished
    onFinished = null
    callback?.()
  }

  function scheduleRetry(delay: number) {
    retryTimer = clearTimer(retryTimer)
    retryTimer = setTimeout(preload, delay)
  }

  function showLoaded() {
    if (showing || !loaded) return false

    const currentAdGroupId = adGroupId
    showing = true
    loaded = false

    try {
      showFullScreenAd({
        options: { adGroupId: currentAdGroupId },
        onEvent: (event) => {
          if (event.type === 'dismissed' || event.type === 'failedToShow') {
            showing = false
            retryCount = 0
            adGroupId = LIVE_INTERSTITIAL_AD_GROUP_ID
            // 다음 노출을 위해 다시 로드해요.
            queueMicrotask(preload)
            // 기다리고 있던 다음 동작(예: 스토어 이동)을 진행해요.
            finish()
          }
        },
        onError: (error) => {
          console.warn('[ads] interstitial show failed', error)
          showing = false
          queueMicrotask(preload)
          finish()
        },
      })
      return true
    } catch (error) {
      console.warn('[ads] interstitial show threw', error)
      showing = false
      finish()
      return false
    }
  }

  function preload() {
    if (!isAdSupported()) return
    if (loading || showing) return

    loading = true
    loaded = false
    unregisterLoad?.()

    const currentAdGroupId = adGroupId

    try {
      unregisterLoad = loadFullScreenAd({
        options: { adGroupId: currentAdGroupId },
        onEvent: (event) => {
          if (event.type !== 'loaded') return

          loading = false
          loaded = true
          retryCount = 0

          if (pendingShow && !showing) {
            pendingShow = false
            showLoaded()
          }
        },
        onError: (error) => {
          loading = false
          loaded = false
          console.warn('[ads] interstitial load failed', { adGroupId: currentAdGroupId, error })

          // 라이브 실패 시 테스트 ID로 한 번 폴백 (샌드박스 no-fill 대비)
          if (adGroupId === LIVE_INTERSTITIAL_AD_GROUP_ID) {
            adGroupId = TEST_INTERSTITIAL_AD_GROUP_ID
            retryCount = 0
            scheduleRetry(TEST_ID_FALLBACK_DELAY_MS)
            return
          }

          // 테스트 ID도 실패하면 짧게 재시도 (pending 유지)
          if (retryCount < MAX_RETRIES) {
            retryCount += 1
            scheduleRetry(RETRY_BASE_DELAY_MS * retryCount)
            return
          }

          pendingShow = false
          adGroupId = LIVE_INTERSTITIAL_AD_GROUP_ID
          retryCount = 0
          // 광고 로드를 계속 실패했으면, 다음 동작을 계속 기다리게 두지 않아요.
          finish()
        },
      })
    } catch (error) {
      loading = false
      console.warn('[ads] interstitial load threw', error)
      pendingShow = false
      finish()
    }
  }

  function show(callback?: () => void) {
    if (!isAdSupported() || showing) {
      callback?.()
      return false
    }

    onFinished = callback ?? null
    pendingShow = true

    if (loaded) {
      pendingShow = false
      const started = showLoaded()
      if (!started) finish()
      return started
    }

    // 로드 중이 아니면 다시 로드를 시작하고, 로드되는 대로 보여줘요.
    if (!loading) preload()

    finishTimer = clearTimer(finishTimer)
    finishTimer = setTimeout(() => {
      if (!showing) {
        pendingShow = false
        finish()
      }
    }, SHOW_TIMEOUT_MS)

    return false
  }

  function start() {
    bootTimer = clearTimer(bootTimer)
    bootTimer = setTimeout(preload, BOOT_DELAY_MS)
  }

  function dispose() {
    bootTimer = clearTimer(bootTimer)
    retryTimer = clearTimer(retryTimer)
    finishTimer = clearTimer(finishTimer)
    unregisterLoad?.()
    unregisterLoad = null
    loading = false
  }

  return { start, dispose, show }
}
