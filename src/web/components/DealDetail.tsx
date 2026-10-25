import { useEffect, useRef } from 'react'
import { resolveStoreUrl } from '../../features/game-deals/api/storeUrl'
import { CHEAPSHARK_STORE_NAMES, cheapSharkRedirectUrl } from '../data/cheapshark'
import { platformKeyOf, platformLabelOf, type WebDeal } from '../data/types'
import { formatCount, formatDate, formatDealPrice, formatKrw, formatUsd } from '../format'
import { useDealDetail } from '../hooks/useDealDetail'
import { CloseIcon, ExternalIcon, HeartIcon, ShareIcon } from './icons'

interface DealDetailProps {
  deal: WebDeal
  usdKrwRate: number | null
  snapshotDate: string
  wished: boolean
  onToggleWish: (deal: WebDeal) => void
  onShare: (deal: WebDeal) => void
  onClose: () => void
}

/** 게임 상세 — 가격, 역대 최저가, 평점, 다른 스토어 가격, 스토어 이동/찜/공유 */
export function DealDetail({ deal, usdKrwRate, snapshotDate, wished, onToggleWish, onShare, onClose }: DealDetailProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const { status, detail } = useDealDetail(deal.source === 'cheapshark' ? deal.cheapSharkDealId : undefined)

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const onSale = deal.discountRate > 0
  const savings = Math.max(0, deal.originalPrice - deal.salePrice)
  const toKrw = (usd: number) => (usdKrwRate === null ? null : Math.round(usd * usdKrwRate))

  const cheapestUsd = detail?.cheapestPrice ? Number(detail.cheapestPrice.price) : null
  const isAllTimeLow =
    cheapestUsd !== null && deal.usdSalePrice !== undefined && deal.usdSalePrice <= cheapestUsd + 0.001
  const info = detail?.gameInfo
  const ratingPercent = info ? Number(info.steamRatingPercent) : deal.steamRatingPercent
  const ratingCount = info ? Number(info.steamRatingCount) : deal.steamRatingCount
  const ratingText = info?.steamRatingText ?? deal.steamRatingText
  const metacritic = info ? Number(info.metacriticScore) : deal.metacriticScore
  const releaseDate = info?.releaseDate || deal.releaseDate
  const publisher = info?.publisher && info.publisher !== 'N/A' ? info.publisher : null
  const cheaperStores = (detail?.cheaperStores ?? []).filter((store) => CHEAPSHARK_STORE_NAMES[store.storeID])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="deal-detail-title">
      <div className="modal__backdrop" onClick={onClose} aria-hidden />
      <div className="modal__panel">
        <button ref={closeRef} type="button" className="modal__close" onClick={onClose} aria-label="닫기">
          <CloseIcon />
        </button>

        <div className="detail__media">
          <img className="card__backdrop" src={deal.thumbnailUrl} alt="" aria-hidden />
          <img className="detail__image" src={deal.thumbnailUrl} alt="" />
        </div>

        <div className="detail__body">
          <span className={`platform platform--${platformKeyOf(deal.platform)}`}>{platformLabelOf(deal.platform)}</span>
          <h2 id="deal-detail-title" className="detail__title">
            {deal.title}
          </h2>

          <div className="detail__price">
            {onSale && <span className="detail__badge">-{deal.discountRate}%</span>}
            <div>
              {onSale && <s className="card__original">{formatDealPrice(deal, deal.originalPrice)}</s>}
              <strong className="detail__sale">{formatDealPrice(deal, deal.salePrice)}</strong>
            </div>
            {savings > 0 && <span className="detail__savings">{formatKrw(savings)} 절약</span>}
          </div>

          {deal.source === 'cheapshark' && deal.usdSalePrice !== undefined && (
            <p className="detail__note">
              미국 스토어 {formatUsd(deal.usdSalePrice)} 기준 환산가예요. 한국 스토어 가격은 다를 수 있어요.
            </p>
          )}
          {deal.source === 'snapshot' && (
            <p className="detail__note">{snapshotDate} 기준 가격이에요. 정확한 가격과 할인 기간은 스토어에서 확인해 주세요.</p>
          )}

          {deal.source === 'cheapshark' && (
            <section className="detail__facts" aria-busy={status === 'loading'}>
              <div className="fact">
                <span className="fact__label">역대 최저가</span>
                {status === 'loading' && <span className="shimmer shimmer--line" style={{ width: 90 }} />}
                {status === 'error' && <span className="fact__value muted">불러오지 못했어요</span>}
                {cheapestUsd !== null && (
                  <span className="fact__value">
                    {cheapestUsd === 0 ? '무료' : `≈ ${formatKrw(toKrw(cheapestUsd) ?? 0)}`}
                    {detail?.cheapestPrice?.date ? <small> · {formatDate(detail.cheapestPrice.date)}</small> : null}
                    {isAllTimeLow && <em className="tag tag--hot">지금이 역대 최저가</em>}
                  </span>
                )}
                {status === 'ready' && cheapestUsd === null && <span className="fact__value muted">기록 없음</span>}
              </div>
              {ratingPercent ? (
                <div className="fact">
                  <span className="fact__label">스팀 평가</span>
                  <span className="fact__value">
                    {ratingText ? `${ratingText} · ` : ''}
                    {ratingPercent}%{ratingCount ? <small> ({formatCount(ratingCount)}개)</small> : null}
                  </span>
                </div>
              ) : null}
              {metacritic ? (
                <div className="fact">
                  <span className="fact__label">메타크리틱</span>
                  <span className="fact__value">
                    <span className={`score${metacritic >= 75 ? ' score--good' : metacritic >= 50 ? ' score--mid' : ''}`}>{metacritic}</span>
                  </span>
                </div>
              ) : null}
              {releaseDate ? (
                <div className="fact">
                  <span className="fact__label">출시일</span>
                  <span className="fact__value">{formatDate(releaseDate)}</span>
                </div>
              ) : null}
              {publisher && (
                <div className="fact">
                  <span className="fact__label">퍼블리셔</span>
                  <span className="fact__value">{publisher}</span>
                </div>
              )}
            </section>
          )}

          {cheaperStores.length > 0 && (
            <section className="detail__stores">
              <h3>다른 스토어에서 더 싸요</h3>
              <ul>
                {cheaperStores.map((store) => (
                  <li key={store.dealID}>
                    <a href={cheapSharkRedirectUrl(store.dealID)} target="_blank" rel="noopener noreferrer">
                      <span>{CHEAPSHARK_STORE_NAMES[store.storeID]}</span>
                      <strong>
                        {formatUsd(Number(store.salePrice))}
                        {toKrw(Number(store.salePrice)) !== null && <small> ≈ {formatKrw(toKrw(Number(store.salePrice)) ?? 0)}</small>}
                      </strong>
                      <ExternalIcon />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="detail__actions">
            <a className="button button--primary" href={resolveStoreUrl(deal)} target="_blank" rel="noopener noreferrer">
              {platformLabelOf(deal.platform)} 스토어에서 보기 <ExternalIcon />
            </a>
            <button type="button" className={`button${wished ? ' is-on' : ''}`} onClick={() => onToggleWish(deal)} aria-pressed={wished}>
              <HeartIcon filled={wished} size={18} /> {wished ? '찜 완료' : '찜하기'}
            </button>
            <button type="button" className="button" onClick={() => onShare(deal)}>
              <ShareIcon /> 공유
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
