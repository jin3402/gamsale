import { memo } from 'react'
import { platformKeyOf, platformLabelOf, type WebDeal } from '../data/types'
import { formatDealPrice } from '../format'
import { HeartIcon } from './icons'

interface DealCardProps {
  deal: WebDeal
  wished: boolean
  onOpen: (deal: WebDeal) => void
  onToggleWish: (deal: WebDeal) => void
}

function DealCardView({ deal, wished, onOpen, onToggleWish }: DealCardProps) {
  const isFree = deal.salePrice === 0 && deal.discountRate > 0
  const onSale = deal.discountRate > 0

  return (
    <article className="card">
      <button type="button" className="card__hit" onClick={() => onOpen(deal)} aria-label={`${deal.title} 상세 보기`}>
        <div className="card__media">
          <img className="card__backdrop" src={deal.thumbnailUrl} alt="" aria-hidden loading="lazy" />
          <img className="card__image" src={deal.thumbnailUrl} alt="" loading="lazy" />
          {onSale && <span className={`card__discount${isFree ? ' card__discount--free' : ''}`}>{isFree ? 'FREE' : `-${deal.discountRate}%`}</span>}
        </div>
        <div className="card__body">
          <div className="card__meta">
            <span className={`platform platform--${platformKeyOf(deal.platform)}`}>{platformLabelOf(deal.platform)}</span>
            {deal.steamRatingPercent !== undefined && (
              <span className="card__rating" title={deal.steamRatingText}>
                👍 {deal.steamRatingPercent}%
              </span>
            )}
          </div>
          <h3 className="card__title">{deal.title}</h3>
          <div className="card__prices">
            {onSale && <s className="card__original">{formatDealPrice(deal, deal.originalPrice)}</s>}
            <strong className={`card__sale${isFree ? ' card__sale--free' : ''}`}>{formatDealPrice(deal, deal.salePrice)}</strong>
          </div>
        </div>
      </button>
      <button
        type="button"
        className={`card__wish${wished ? ' is-on' : ''}`}
        onClick={() => onToggleWish(deal)}
        aria-pressed={wished}
        aria-label={wished ? `${deal.title} 찜 해제` : `${deal.title} 찜하기`}
      >
        <HeartIcon filled={wished} />
      </button>
    </article>
  )
}

export const DealCard = memo(DealCardView)

export function DealCardSkeleton() {
  return (
    <div className="card card--skeleton" aria-hidden>
      <div className="card__media shimmer" />
      <div className="card__body">
        <div className="shimmer shimmer--line" style={{ width: '40%' }} />
        <div className="shimmer shimmer--line" style={{ width: '90%' }} />
        <div className="shimmer shimmer--line" style={{ width: '55%' }} />
      </div>
    </div>
  )
}
