import { useEffect } from 'react'
import { resolveStoreUrl } from '../../features/game-deals/api/storeUrl'
import { platformLabelOf, type WebDeal } from '../data/types'
import { formatDealPrice, formatKrw } from '../format'
import { CloseIcon, ExternalIcon } from './icons'

interface WishlistDrawerProps {
  items: WebDeal[]
  onOpenDeal: (deal: WebDeal) => void
  onRemove: (id: string) => void
  onClear: () => void
  onShare: () => void
  onClose: () => void
}

/** 찜한 게임 목록 (이 브라우저에만 저장돼요) */
export function WishlistDrawer({ items, onOpenDeal, onRemove, onClear, onShare, onClose }: WishlistDrawerProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const total = items.reduce((sum, deal) => sum + deal.salePrice, 0)
  const savings = items.reduce((sum, deal) => sum + Math.max(0, deal.originalPrice - deal.salePrice), 0)

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="찜한 게임">
      <div className="modal__backdrop" onClick={onClose} aria-hidden />
      <aside className="drawer__panel">
        <header className="drawer__header">
          <h2>찜한 게임 {items.length > 0 && <span className="muted">{items.length}</span>}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="empty">
            <p className="empty__title">아직 찜한 게임이 없어요</p>
            <p className="muted">카드의 하트를 누르면 여기에 모아 둘 수 있어요.</p>
          </div>
        ) : (
          <>
            <ul className="wish-list">
              {items.map((deal) => (
                <li key={deal.id} className="wish-item">
                  <button type="button" className="wish-item__main" onClick={() => onOpenDeal(deal)}>
                    <img src={deal.thumbnailUrl} alt="" loading="lazy" />
                    <span>
                      <span className="wish-item__title">{deal.title}</span>
                      <span className="wish-item__meta">
                        {platformLabelOf(deal.platform)} · {deal.discountRate > 0 ? `-${deal.discountRate}% · ` : ''}
                        <strong>{formatDealPrice(deal, deal.salePrice)}</strong>
                      </span>
                    </span>
                  </button>
                  <div className="wish-item__actions">
                    <a className="icon-button" href={resolveStoreUrl(deal)} target="_blank" rel="noopener noreferrer" aria-label="스토어에서 보기">
                      <ExternalIcon />
                    </a>
                    <button type="button" className="icon-button" onClick={() => onRemove(deal.id)} aria-label={`${deal.title} 찜 해제`}>
                      <CloseIcon size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="drawer__footer">
              <div className="drawer__sum">
                <span>합계 {formatKrw(total)}</span>
                {savings > 0 && <strong>{formatKrw(savings)} 절약</strong>}
              </div>
              <p className="muted small">찜 시점 가격이에요. 할인은 끝났을 수 있어요.</p>
              <div className="drawer__buttons">
                <button type="button" className="button button--primary" onClick={onShare}>
                  목록 공유
                </button>
                <button type="button" className="button" onClick={onClear}>
                  모두 지우기
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
