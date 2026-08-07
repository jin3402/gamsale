import { useState } from 'react'
import { Button, IconButton, List, ListRow, Top } from '@toss/tds-mobile'
import { shareWishlist } from './shareWishlist'
import { useWishlistContext } from './WishlistContext'
import { SHARE_ACTION_LABEL } from '../dealActionLabels'

interface WishlistPanelProps {
  open: boolean
  onClose: () => void
}

function formatPrice(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

export default function WishlistPanel({ open, onClose }: WishlistPanelProps) {
  const { items, remove, clear } = useWishlistContext()
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const handleShare = async () => {
    if (items.length === 0) return
    setBusy(true)
    setStatus(null)
    try {
      // 공유가 성공하면 shareWishlist 내부(share.ts)에서 "서비스 공유하기" 프로모션을
      // 기기당 1회로 자동 지급 시도해요. 어떤 공유 경로든 동일하게 처리돼요.
      await shareWishlist(items)
      setStatus('공유 시트를 열었어요.')
    } catch {
      setStatus('공유에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wishlist-panel" role="dialog" aria-modal="true" aria-label="위시리스트">
      <div className="wishlist-panel__backdrop" onClick={onClose} aria-hidden />
      <div className="wishlist-panel__sheet">
        <Top
          title={<Top.TitleParagraph>위시리스트</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph>
              찜한 게임은 이 기기에 저장돼요. 필요할 때 공유할 수 있어요.
            </Top.SubtitleParagraph>
          }
          right={
            <IconButton
              variant="clear"
              name="icon-x-mono"
              iconSize={22}
              aria-label="위시리스트 닫기"
              onClick={onClose}
            />
          }
        />

        {items.length === 0 ? (
          <p className="wishlist-panel__empty">아직 찜한 게임이 없어요.</p>
        ) : (
          <List className="wishlist-panel__list">
            {items.map((deal) => (
              <ListRow
                key={deal.id}
                verticalPadding="medium"
                left={
                  <ListRow.AssetImage src={deal.thumbnailUrl} size="small" shape="squircle" />
                }
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={deal.title}
                    bottom={`${deal.platform} · -${deal.discountRate}% · ${formatPrice(deal.salePrice)}`}
                  />
                }
                right={
                  <IconButton
                    variant="clear"
                    name="icon-x-mono"
                    iconSize={20}
                    aria-label={`${deal.title} 찜 해제`}
                    onClick={() => remove(deal.id)}
                  />
                }
              />
            ))}
          </List>
        )}

        {status ? <p className="wishlist-panel__status">{status}</p> : null}

        <div className="wishlist-panel__actions">
          <Button
            size="large"
            display="block"
            disabled={items.length === 0}
            loading={busy}
            onClick={() => void handleShare()}
          >
            {SHARE_ACTION_LABEL}
          </Button>
          {items.length > 0 ? (
            <Button
              size="large"
              display="block"
              color="dark"
              variant="weak"
              onClick={() => {
                clear()
                setStatus('위시리스트를 비웠어요.')
              }}
            >
              전체 삭제
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
