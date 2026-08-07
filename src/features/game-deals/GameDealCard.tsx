import { Badge, IconButton } from '@toss/tds-mobile'
import type { GameDeal } from './types'

interface GameDealCardProps {
  deal: GameDeal
  wishlisted: boolean
  endsAtLabel: string | null
  onToggleWishlist: () => void
  onOpenActions: () => void
}

function formatPrice(value: number) {
  return `${value.toLocaleString('ko-KR')}원`
}

export default function GameDealCard({
  deal,
  wishlisted,
  endsAtLabel,
  onToggleWishlist,
  onOpenActions,
}: GameDealCardProps) {
  return (
    <article
      className="game-deal-card"
      style={{ backgroundImage: `url(${deal.thumbnailUrl})` }}
      role="button"
      tabIndex={0}
      aria-label={`${deal.title}, ${deal.discountRate}% 할인, 공유하기 또는 스토어에서 보기`}
      onClick={onOpenActions}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenActions()
        }
      }}
    >
      <div className="game-deal-card__dim" aria-hidden />

      <div className="game-deal-card__content">
        <div className="game-deal-card__top">
          <div className="game-deal-card__badges">
            <Badge size="medium" color="red" variant="fill">
              {`-${deal.discountRate}%`}
            </Badge>
          </div>

          <IconButton
            variant="clear"
            name="icon-heart-mono"
            color={wishlisted ? '#f04452' : '#ffffff'}
            iconSize={24}
            aria-label={wishlisted ? `${deal.title} 찜 해제` : `${deal.title} 찜하기`}
            aria-pressed={wishlisted}
            onClick={(event) => {
              event.stopPropagation()
              onToggleWishlist()
            }}
          />
        </div>

        <div className="game-deal-card__bottom">
          <div className="game-deal-card__text">
            <p className="game-deal-card__platform">{deal.platform}</p>
            <h3 className="game-deal-card__title">{deal.title}</h3>
            <div className="game-deal-card__price">
              <span className="game-deal-card__price-sale">{formatPrice(deal.salePrice)}</span>
              <span className="game-deal-card__price-original">
                {formatPrice(deal.originalPrice)}
              </span>
            </div>
          </div>

          {endsAtLabel ? (
            <p className="game-deal-card__ends-at">{endsAtLabel}</p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
