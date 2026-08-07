import { useState } from 'react'
import { Badge, Button } from '@toss/tds-mobile'
import type { GameDeal } from './types'
import { resolveStoreUrl } from './api/storeUrl'
import { formatDealShareText } from './wishlist/formatWishlist'
import { shareMessage } from './share'
import { SHARE_ACTION_LABEL, STORE_ACTION_LABEL } from './dealActionLabels'

interface DealActionSheetProps {
  deal: GameDeal | null
  onClose: () => void
  /** 전면 광고를 보여주고, 시청(또는 실패/미지원)이 끝나면 `onFinished`를 호출해요. */
  showInterstitialAd: (onFinished?: () => void) => boolean
}

/** 게임 카드를 탭했을 때 "공유하기 / 스토어에서 보기"를 고를 수 있는 액션시트예요. */
export default function DealActionSheet({ deal, onClose, showInterstitialAd }: DealActionSheetProps) {
  const [sharing, setSharing] = useState(false)
  const [openingStore, setOpeningStore] = useState(false)

  if (!deal) return null

  const handleShare = async () => {
    setSharing(true)
    try {
      await shareMessage(formatDealShareText(deal), deal.title)
    } catch {
      // 공유 취소나 미지원 환경은 조용히 무시해요.
    } finally {
      setSharing(false)
      onClose()
    }
  }

  const handleOpenStore = () => {
    const storeUrl = resolveStoreUrl(deal)
    setOpeningStore(true)
    // 전면 광고를 먼저 보여주고, 시청이 끝난 뒤에 스토어로 이동해요.
    // 광고가 없거나(미지원 환경) 로드에 실패해도 여기서 안전하게 스토어로 넘어가요.
    showInterstitialAd(() => {
      setOpeningStore(false)
      window.open(storeUrl, '_blank', 'noopener,noreferrer')
      onClose()
    })
  }

  return (
    <div className="deal-action-sheet" role="dialog" aria-modal="true" aria-label={`${deal.title} 옵션`}>
      <div className="deal-action-sheet__backdrop" onClick={onClose} aria-hidden />
      <div className="deal-action-sheet__sheet">
        <div className="deal-action-sheet__handle" aria-hidden />

        <div className="deal-action-sheet__info">
          <Badge size="small" color="red" variant="fill">
            {`-${deal.discountRate}%`}
          </Badge>
          <p className="deal-action-sheet__title">{deal.title}</p>
          <p className="deal-action-sheet__platform">{deal.platform}</p>
        </div>

        <div className="deal-action-sheet__actions">
          <Button size="large" display="block" loading={openingStore} onClick={handleOpenStore}>
            {STORE_ACTION_LABEL}
          </Button>
          <Button
            size="large"
            display="block"
            color="dark"
            variant="weak"
            loading={sharing}
            onClick={() => void handleShare()}
          >
            {SHARE_ACTION_LABEL}
          </Button>
        </div>
      </div>
    </div>
  )
}
