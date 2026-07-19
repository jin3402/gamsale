import { useCallback, useEffect, useRef, useState } from 'react'
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework'
import { LIVE_INTERSTITIAL_AD_GROUP_ID } from './adIds'

/**
 * 전면형 광고를 미리 로드하고, 필요할 때 노출해요.
 * load → show → (dismiss 후) load 패턴을 따릅니다.
 */
export function useInterstitialAd(adGroupId = LIVE_INTERSTITIAL_AD_GROUP_ID) {
  const [isLoaded, setIsLoaded] = useState(false)
  const isSupported =
    typeof loadFullScreenAd.isSupported === 'function'
      ? loadFullScreenAd.isSupported()
      : false
  const loadingRef = useRef(false)
  const unregisterLoadRef = useRef<(() => void) | null>(null)

  const preload = useCallback(() => {
    if (!isSupported || loadingRef.current) return

    loadingRef.current = true
    setIsLoaded(false)
    unregisterLoadRef.current?.()

    unregisterLoadRef.current = loadFullScreenAd({
      options: { adGroupId },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          loadingRef.current = false
          setIsLoaded(true)
          console.info('[ads] interstitial loaded', { adGroupId })
        }
      },
      onError: (error) => {
        loadingRef.current = false
        setIsLoaded(false)
        console.warn('[ads] interstitial load failed', error)
      },
    })
  }, [adGroupId, isSupported])

  useEffect(() => {
    preload()
    return () => {
      unregisterLoadRef.current?.()
      unregisterLoadRef.current = null
    }
  }, [preload])

  const show = useCallback(() => {
    if (!isSupported || !isLoaded) return false
    if (!showFullScreenAd.isSupported?.()) return false

    setIsLoaded(false)

    showFullScreenAd({
      options: { adGroupId },
      onEvent: (event) => {
        console.info('[ads] interstitial event', event.type)
        if (event.type === 'dismissed' || event.type === 'failedToShow') {
          preload()
        }
      },
      onError: (error) => {
        console.warn('[ads] interstitial show failed', error)
        preload()
      },
    })

    return true
  }, [adGroupId, isLoaded, isSupported, preload])

  return { isSupported, isLoaded, show, preload }
}
