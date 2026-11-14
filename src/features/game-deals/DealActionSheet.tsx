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
}

/** 게임 카드를 탭했을 때 "공유하기 / 스토어에서 보기"를 고를 수 있는 액션시트예요. */
export default function DealActionSheet({ deal, onClose }: DealActionSheetProps) {
  const [sharing, setSharing] = useState(false)

  if (!deal) return null

  const handleShare = async () => {
    setSharing(true)
    try {
      const outcome = await shareMessage(formatDealShareText(deal), deal.title)
      if (outcome === 'copied') {
        window.alert('공유 문구를 클립보드에 복사했어요. 원하는 곳에 붙여넣어 공유해 보세요.')
      }
    } catch {
      // 공유 취소나 미지원 환경은 조용히 무시해요.
    } finally {
      setSharing(false)
      onClose()
    }
  }

  const handleOpenStore = () => {
    window.open(resolveStoreUrl(deal), '_blank', 'noopener,noreferrer')
    onClose()
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
          <Button size="large" display="block" onClick={handleOpenStore}>
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
