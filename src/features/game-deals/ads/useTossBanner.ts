import { useCallback, useEffect, useState } from 'react'
import {
  getTossAds,
  type TossAdsAttachBannerOptions,
  type TossAdsModule,
} from './tossAds'

let initializeStarted = false

/**
 * TossAds SDK를 앱 단위로 한 번만 초기화하고, attachBanner를 제공해요.
 */
export function useTossBanner() {
  const [tossAds, setTossAds] = useState<TossAdsModule | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function setup() {
      const ads = await getTossAds()
      if (cancelled) return

      if (!ads) {
        setIsSupported(false)
        return
      }

      setTossAds(ads)

      const supported = ads.initialize.isSupported?.() ?? true
      setIsSupported(supported)
      if (!supported) return

      if (initializeStarted) {
        setIsInitialized(true)
        return
      }

      initializeStarted = true
      ads.initialize({
        callbacks: {
          onInitialized: () => {
            if (!cancelled) setIsInitialized(true)
          },
          onInitializationFailed: (error) => {
            console.error('[ads] TossAds 초기화 실패', error)
            initializeStarted = false
            if (!cancelled) {
              setIsInitialized(false)
              setIsSupported(false)
            }
          },
        },
      })
    }

    void setup()

    return () => {
      cancelled = true
    }
  }, [])

  const attachBanner = useCallback(
    (
      adGroupId: string,
      element: HTMLElement,
      options?: TossAdsAttachBannerOptions,
    ) => {
      if (!tossAds || !isInitialized) return undefined
      return tossAds.attachBanner(adGroupId, element, options)
    },
    [tossAds, isInitialized],
  )

  return { isInitialized, isSupported, attachBanner }
}
