import { useEffect, useRef, useState } from 'react'
import { LIVE_BANNER_AD_GROUP_ID } from './adIds'
import { useTossBanner } from './useTossBanner'

interface BannerAdProps {
  /** 리스트 내 슬롯 구분용 (6, 12, ...) */
  slotIndex: number
  adGroupId?: string
}

function FallbackBanner({ slotIndex }: { slotIndex: number }) {
  return (
    <aside className="banner-ad banner-ad--fallback" aria-label="광고">
      <span className="banner-ad__label">AD</span>
      <div className="banner-ad__body">
        <p className="banner-ad__title">할인 게임 알림 추천</p>
        <p className="banner-ad__desc">
          위시리스트에 담아두면 할인 종료 전날 알려드려요
        </p>
      </div>
      <span className="banner-ad__slot">#{slotIndex}</span>
    </aside>
  )
}

/**
 * 목록형 배너 광고.
 * - 토스 앱(WebView) + TossAds 지원 환경: 실제 배너 부착
 * - 로컬 브라우저: 테스트용 플레이스홀더 배너 표시
 */
export default function BannerAd({
  slotIndex,
  adGroupId = LIVE_BANNER_AD_GROUP_ID,
}: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isInitialized, isSupported, attachBanner } = useTossBanner()
  const [attachFailed, setAttachFailed] = useState(false)

  useEffect(() => {
    if (!isSupported || !isInitialized || !containerRef.current) return

    const attached = attachBanner(adGroupId, containerRef.current, {
      theme: 'auto',
      tone: 'grey',
      variant: 'card',
      callbacks: {
        onAdRendered: () => {
          console.info('[ads] rendered', { slotIndex, adGroupId })
        },
        onAdImpression: () => {
          console.info('[ads] impression', { slotIndex, adGroupId })
        },
        onAdFailedToRender: (payload) => {
          console.warn('[ads] failed', payload)
          setAttachFailed(true)
        },
        onNoFill: () => {
          console.warn('[ads] no-fill', { slotIndex, adGroupId })
          setAttachFailed(true)
        },
      },
    })

    return () => {
      attached?.destroy()
    }
  }, [adGroupId, attachBanner, isInitialized, isSupported, slotIndex])

  if (!isSupported || attachFailed) {
    return <FallbackBanner slotIndex={slotIndex} />
  }

  return (
    <div
      ref={containerRef}
      className="banner-ad"
      style={{ width: '100%', minHeight: 96 }}
      aria-label="배너 광고"
    />
  )
}
