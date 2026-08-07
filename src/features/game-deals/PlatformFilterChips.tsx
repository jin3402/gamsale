import { Chip, ChipItem } from '@toss/tds-mobile'
import type { Platform } from './types'

export type PlatformFilterValue = '전체' | Platform

/** 가로 슬라이드로 모두 노출 — 순서: 스팀 → 에픽 → 엑스박스 → 플스 → 닌텐도 */
const PLATFORM_OPTIONS: PlatformFilterValue[] = [
  '전체',
  'Steam',
  'Epic Games',
  'Xbox',
  'PlayStation',
  'Nintendo Switch',
]

const PLATFORM_LABELS: Record<PlatformFilterValue, string> = {
  전체: '전체',
  Steam: 'Steam',
  'Epic Games': 'Epic',
  Xbox: 'Xbox',
  PlayStation: 'PlayStation',
  'Nintendo Switch': 'Nintendo',
}

interface PlatformFilterChipsProps {
  value: PlatformFilterValue
  onChange: (value: PlatformFilterValue) => void
}

export default function PlatformFilterChips({ value, onChange }: PlatformFilterChipsProps) {
  return (
    <div className="game-deal-list__platforms">
      <Chip kind="select" size="small" variant="weak" shape="pill" margin="none" wrap={false}>
        {PLATFORM_OPTIONS.map((item) => (
          <ChipItem key={item} selected={value === item} onClick={() => onChange(item)}>
            {PLATFORM_LABELS[item]}
          </ChipItem>
        ))}
      </Chip>
    </div>
  )
}
