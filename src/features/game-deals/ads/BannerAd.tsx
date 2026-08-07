import { useEffect, useRef, useState } from 'react'
import { LIVE_BANNER_AD_GROUP_ID } from './adIds'
import { useTossBanner } from './useTossBanner'

interface BannerAdProps {
  /** 리스트 내 슬롯 구분용 (6, 12, ...) */
  slotIndex: number
  adGroupId?: string
}

/**
 * 목록형 배너 광고.
 * - 토스 앱 + TossAds 지원: 실제 배너
 * - 미지원·로드 실패: 예시/가짜 광고는 보여주지 않음
 */
export default function BannerAd({
  slotIndex,
  adGroupId = LIVE_BANNER_AD_GROUP_ID,
}: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isInitialized, isSupported, attachBanner } = useTossBanner()
  const [attachFailed, setAttachFailed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isSupported || !isInitialized || !containerRef.current) return

    const attached = attachBanner(adGroupId, containerRef.current, {
      theme: 'auto',
      tone: 'grey',
      variant: 'card',
      callbacks: {
        onAdRendered: () => {
          setReady(true)
          console.info('[ads] rendered', { slotIndex, adGroupId })
        },
        onAdImpression: () => {
          console.info('[ads] impression', { slotIndex, adGroupId })
        },
        onAdFailedToRender: (payload) => {
          console.warn('[ads] failed', payload)
          setAttachFailed(true)
          setReady(false)
        },
        onNoFill: () => {
          console.warn('[ads] no-fill', { slotIndex, adGroupId })
          setAttachFailed(true)
          setReady(false)
        },
      },
    })

    return () => {
      attached?.destroy()
    }
  }, [adGroupId, attachBanner, isInitialized, isSupported, slotIndex])

  // 로컬/미지원/실패 시 플레이스홀더(예시 광고)를 넣지 않아요.
  if (!isSupported || attachFailed) {
    return null
  }

  // 초기화 전에는 빈 슬롯도 숨겨 레이아웃 깜빡임을 줄여요.
  if (!isInitialized) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="banner-ad"
      style={{
        width: '100%',
        minHeight: ready ? 96 : 0,
        display: ready ? 'block' : 'none',
      }}
      aria-label="배너 광고"
      aria-hidden={!ready}
    />
  )
}
