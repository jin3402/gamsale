import { DISCOUNT_OPTIONS, PRICE_OPTIONS, SORT_OPTIONS, isFiltered, type DealQuery, type SortKey } from '../data/query'
import { PLATFORMS, type PlatformKey } from '../data/types'
import { formatCount } from '../format'

interface FilterBarProps {
  query: DealQuery
  platformCounts: Record<PlatformKey, number>
  totalCount: number
  onChange: (update: Partial<DealQuery>) => void
  onReset: () => void
}

function priceLabel(value: number | null) {
  if (value === null) return '가격 전체'
  if (value === 0) return '무료만'
  return `${formatCount(value)}원 이하`
}

/** 플랫폼 칩(여러 개 선택) + 할인율·가격·정렬 선택. 모든 조건은 주소창에 저장돼요. */
export function FilterBar({ query, platformCounts, totalCount, onChange, onReset }: FilterBarProps) {
  const togglePlatform = (key: PlatformKey) => {
    const selected = new Set(query.platforms)
    if (selected.has(key)) selected.delete(key)
    else selected.add(key)
    // 칩 순서를 항상 같게 유지해서 URL도 안정적으로 만들어요.
    onChange({ platforms: PLATFORMS.map((info) => info.key).filter((k) => selected.has(k)) })
  }

  return (
    <div className="filters">
      <div className="filters__chips" role="group" aria-label="플랫폼">
        <button
          type="button"
          className={`chip${query.platforms.length === 0 ? ' is-on' : ''}`}
          onClick={() => onChange({ platforms: [] })}
          aria-pressed={query.platforms.length === 0}
        >
          전체 <span className="chip__count">{formatCount(totalCount)}</span>
        </button>
        {PLATFORMS.map((info) => {
          const on = query.platforms.includes(info.key)
          return (
            <button
              key={info.key}
              type="button"
              className={`chip chip--${info.key}${on ? ' is-on' : ''}`}
              onClick={() => togglePlatform(info.key)}
              aria-pressed={on}
            >
              <span className={`chip__dot platform-dot--${info.key}`} aria-hidden />
              {info.label} <span className="chip__count">{formatCount(platformCounts[info.key])}</span>
            </button>
          )
        })}
      </div>

      <div className="filters__selects">
        <label className="select">
          <span className="sr-only">최소 할인율</span>
          <select value={query.minDiscount} onChange={(event) => onChange({ minDiscount: Number(event.target.value) })}>
            {DISCOUNT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value === 0 ? '할인율 전체' : `${value}% 이상 할인`}
              </option>
            ))}
          </select>
        </label>

        <label className="select">
          <span className="sr-only">최대 가격</span>
          <select
            value={query.maxPrice === null ? '' : String(query.maxPrice)}
            onChange={(event) => onChange({ maxPrice: event.target.value === '' ? null : Number(event.target.value) })}
          >
            {PRICE_OPTIONS.map((value) => (
              <option key={String(value)} value={value === null ? '' : String(value)}>
                {priceLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="select">
          <span className="sr-only">정렬</span>
          <select value={query.sort} onChange={(event) => onChange({ sort: event.target.value as SortKey })}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {query.q && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={query.includeFullPrice}
              onChange={(event) => onChange({ includeFullPrice: event.target.checked })}
            />
            <span>정가 게임도 보기</span>
          </label>
        )}

        {isFiltered(query) && (
          <button type="button" className="link-button" onClick={onReset}>
            필터 초기화
          </button>
        )}
      </div>
    </div>
  )
}
