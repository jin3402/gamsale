/**
 * 설치된 web-framework 버전에 TossAds가 없을 수 있어 안전하게 조회해요.
 * @see https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/BannerAd.md
 */

export { LIVE_BANNER_AD_GROUP_ID, TEST_BANNER_AD_GROUP_ID } from './adIds'

export interface TossAdsAttachBannerOptions {
  theme?: 'auto' | 'light' | 'dark'
  tone?: 'blackAndWhite' | 'grey'
  variant?: 'card' | 'expanded'
  callbacks?: {
    onAdRendered?: (payload: unknown) => void
    onAdImpression?: (payload: unknown) => void
    onAdViewable?: (payload: unknown) => void
    onAdClicked?: (payload: unknown) => void
    onAdFailedToRender?: (payload: unknown) => void
    onNoFill?: (payload: unknown) => void
  }
}

export interface TossAdsModule {
  initialize: ((options?: {
    callbacks?: {
      onInitialized?: () => void
      onInitializationFailed?: (error: Error) => void
    }
  }) => void) & {
    isSupported?: () => boolean
  }
  attachBanner: (
    adGroupId: string,
    target: string | HTMLElement,
    options?: TossAdsAttachBannerOptions,
  ) => { destroy: () => void } | undefined
  destroyAll?: () => void
}

let cached: TossAdsModule | null | undefined

export async function getTossAds(): Promise<TossAdsModule | null> {
  if (cached !== undefined) return cached

  try {
    const mod = (await import('@apps-in-toss/web-framework')) as {
      TossAds?: TossAdsModule
    }
    cached = mod.TossAds ?? null
  } catch {
    cached = null
  }

  return cached
}
