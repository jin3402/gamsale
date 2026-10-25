import { useEffect, useRef } from 'react'
import { CloseIcon, SearchIcon } from './icons'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  isSearching: boolean
}

/** 상단 검색창. 어디서든 `/` 키를 누르면 바로 검색창으로 이동해요. */
export function SearchBar({ value, onChange, isSearching }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        inputRef.current?.blur()
      }}
    >
      <span className="search__icon">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        className="search__input"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        placeholder="게임 이름으로 검색 (예: Hades, Elden Ring, 태고의 달인)"
        aria-label="게임 검색"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            onChange('')
          }
        }}
        autoComplete="off"
        spellCheck={false}
      />
      {isSearching && <span className="search__spinner" aria-label="검색 중" />}
      {value ? (
        <button type="button" className="search__clear" onClick={() => onChange('')} aria-label="검색어 지우기">
          <CloseIcon size={18} />
        </button>
      ) : (
        <kbd className="search__kbd" aria-hidden>
          /
        </kbd>
      )}
    </form>
  )
}
