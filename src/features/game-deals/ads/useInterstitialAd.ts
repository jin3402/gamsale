import { useCallback, useEffect, useRef, useState } from 'react'
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework'
import { LIVE_INTERSTITIAL_AD_GROUP_ID, TEST_INTERSTITIAL_AD_GROUP_ID } from './adIds'

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

function safeIsSupported() {
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

/**
 * 전면형 광고: load → show → load
 * 플랫폼 탭(Steam/Epic 등) 전환 시 호출되며, 호출 빈도는 화면 쪽에서 제어해요.
 */
export function useInterstitialAd() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  const adGroupIdRef = useRef(LIVE_INTERSTITIAL_AD_GROUP_ID)
  const loadingRef = useRef(false)
  const loadedRef = useRef(false)
  const pendingShowRef = useRef(false)
  const showingRef = useRef(false)
  const retryCountRef = useRef(0)
  const unregisterLoadRef = useRef<(() => void) | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onFinishedRef = useRef<(() => void) | null>(null)
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runOnFinished = () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current)
      finishTimeoutRef.current = null
    }
    const onFinished = onFinishedRef.current
    onFinishedRef.current = null
    onFinished?.()
  }

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }

  const showLoaded = useCallback(() => {
    if (showingRef.current || !loadedRef.current) return false

    const adGroupId = adGroupIdRef.current
    showingRef.current = true
    loadedRef.current = false
    setIsLoaded(false)

    try {
      showFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          console.info('[ads] interstitial event', event.type, { adGroupId })
          if (event.type === 'dismissed' || event.type === 'failedToShow') {
            showingRef.current = false
            retryCountRef.current = 0
            adGroupIdRef.current = LIVE_INTERSTITIAL_AD_GROUP_ID
            // 다음을 위해 다시 로드
            queueMicrotask(() => preloadRef.current())
            // 광고 시청(또는 실패)이 끝났으니, 기다리고 있던 다음 동작(예: 스토어 이동)을 진행해요.
            runOnFinished()
          }
        },
        onError: (error) => {
          console.warn('[ads] interstitial show failed', error)
          showingRef.current = false
          queueMicrotask(() => preloadRef.current())
          runOnFinished()
        },
      })
      console.info('[ads] interstitial show requested', { adGroupId })
      return true
    } catch (error) {
      console.warn('[ads] interstitial show threw', error)
      showingRef.current = false
      runOnFinished()
      return false
    }
  }, [])

  const showLoadedRef = useRef(showLoaded)
  showLoadedRef.current = showLoaded

  const preloadRef = useRef<() => void>(() => {})

  const preload = useCallback(() => {
    if (!safeIsSupported()) {
      setIsSupported(false)
      return
    }
    setIsSupported(true)

    if (loadingRef.current || showingRef.current) return

    loadingRef.current = true
    loadedRef.current = false
    setIsLoaded(false)
    unregisterLoadRef.current?.()

    const adGroupId = adGroupIdRef.current
    console.info('[ads] interstitial loading', { adGroupId, retry: retryCountRef.current })

    try {
      unregisterLoadRef.current = loadFullScreenAd({
        options: { adGroupId },
        onEvent: (event) => {
          if (event.type !== 'loaded') return

          loadingRef.current = false
          loadedRef.current = true
          retryCountRef.current = 0
          setIsLoaded(true)
          console.info('[ads] interstitial loaded', { adGroupId })

          if (pendingShowRef.current && !showingRef.current) {
            pendingShowRef.current = false
            showLoadedRef.current()
          }
        },
        onError: (error) => {
          loadingRef.current = false
          loadedRef.current = false
          setIsLoaded(false)
          console.warn('[ads] interstitial load failed', { adGroupId, error })

          // 라이브 실패 시 테스트 ID로 한 번 폴백 (샌드박스 no-fill 대비)
          if (adGroupIdRef.current === LIVE_INTERSTITIAL_AD_GROUP_ID) {
            adGroupIdRef.current = TEST_INTERSTITIAL_AD_GROUP_ID
            retryCountRef.current = 0
            clearRetryTimer()
            retryTimerRef.current = setTimeout(() => preloadRef.current(), 300)
            return
          }

          // 테스트 ID도 실패하면 짧게 재시도 (pending 유지)
          if (retryCountRef.current < 3) {
            retryCountRef.current += 1
            clearRetryTimer()
            retryTimerRef.current = setTimeout(() => preloadRef.current(), 800 * retryCountRef.current)
            return
          }

          pendingShowRef.current = false
          adGroupIdRef.current = LIVE_INTERSTITIAL_AD_GROUP_ID
          retryCountRef.current = 0
          // 광고 로드를 계속 실패했으면, 다음 동작(스토어 이동 등)을 계속 기다리게 두지 않아요.
          runOnFinished()
        },
      })
    } catch (error) {
      loadingRef.current = false
      console.warn('[ads] interstitial load threw', error)
      pendingShowRef.current = false
      runOnFinished()
    }
  }, [])

  preloadRef.current = preload

  useEffect(() => {
    // 브릿지 준비 후 로드
    const boot = window.setTimeout(() => {
      setIsSupported(safeIsSupported())
      preloadRef.current()
    }, 100)

    return () => {
      window.clearTimeout(boot)
      clearRetryTimer()
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current)
      unregisterLoadRef.current?.()
      unregisterLoadRef.current = null
    }
  }, [])

  /**
   * 전면 광고를 보여줘요. `onFinished`는 광고 시청이 끝났을 때(닫힘/실패/미지원 포함) 딱 한 번 호출돼요.
   * 스토어 이동처럼 "광고 시청 후에" 이어서 할 동작을 여기에 넘기면 돼요.
   * 광고가 계속 안 뜨는 상황에서도 사용자가 갇히지 않도록, 일정 시간 지나면 안전하게 넘어가요.
   */
  const show = useCallback((onFinished?: () => void) => {
    if (!safeIsSupported()) {
      console.warn('[ads] interstitial not supported (browser/local?)')
      setIsSupported(false)
      onFinished?.()
      return false
    }
    setIsSupported(true)

    if (showingRef.current) {
      console.info('[ads] interstitial already showing')
      onFinished?.()
      return false
    }

    onFinishedRef.current = onFinished ?? null

    // 칩 탭 시 노출 요청 (호출 빈도는 GameDealList에서 5번당 1회로 제한)
    pendingShowRef.current = true
    console.info('[ads] interstitial show requested', {
      loaded: loadedRef.current,
      loading: loadingRef.current,
      adGroupId: adGroupIdRef.current,
    })

    if (loadedRef.current) {
      pendingShowRef.current = false
      const started = showLoadedRef.current()
      if (!started) runOnFinished()
      return started
    }

    // 로드 중이 아니면 다시 로드 시작
    if (!loadingRef.current) {
      preloadRef.current()
    }

    // 광고가 끝내 로드되지 않아도 다음 동작(스토어 이동 등)이 무기한 막히지 않게 해요.
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current)
    finishTimeoutRef.current = setTimeout(() => {
      if (!showingRef.current) {
        pendingShowRef.current = false
        runOnFinished()
      }
    }, 4000)

    return false
  }, [])

  return { isSupported, isLoaded, show, preload }
}
