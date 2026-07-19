import { BottomSheet, Chip, ChipItem, useBottomSheet } from '@toss/tds-mobile'
import type { Platform } from './types'

export type PlatformFilterValue = '전체' | Platform

/** 상단에 기본 노출하는 칩 (최대 4개) */
const PRIMARY_PLATFORMS: PlatformFilterValue[] = [
  '전체',
  'Steam',
  'PlayStation',
  'Xbox',
]

/** 더보기(...)에서 고르는 나머지 플랫폼 */
const MORE_PLATFORMS: Platform[] = ['Nintendo Switch', 'Epic Games']

const PLATFORM_LABELS: Record<PlatformFilterValue, string> = {
  전체: '전체',
  Steam: 'Steam',
  PlayStation: 'PlayStation',
  Xbox: 'Xbox',
  'Nintendo Switch': 'Nintendo Switch',
  'Epic Games': '에픽게임즈(Epic Games)',
}

interface PlatformFilterChipsProps {
  value: PlatformFilterValue
  onChange: (value: PlatformFilterValue) => void
}

function isMorePlatform(value: PlatformFilterValue): value is Platform {
  return MORE_PLATFORMS.includes(value as Platform)
}

export default function PlatformFilterChips({ value, onChange }: PlatformFilterChipsProps) {
  const { open, close } = useBottomSheet()
  const moreSelected = isMorePlatform(value)

  const openMoreSheet = () => {
    open({
      onClose: close,
      header: <BottomSheet.Header>플랫폼 선택</BottomSheet.Header>,
      headerDescription: (
        <BottomSheet.HeaderDescription>
          Nintendo Switch, 에픽게임즈 등 나머지 스토어를 골라주세요
        </BottomSheet.HeaderDescription>
      ),
      children: (
        <BottomSheet.Select
          value={moreSelected ? value : undefined}
          options={MORE_PLATFORMS.map((platform) => ({
            name: PLATFORM_LABELS[platform],
            value: platform,
          }))}
          onChange={(event) => {
            onChange(event.target.value as Platform)
            close()
          }}
        />
      ),
    })
  }

  return (
    <div className="game-deal-list__platforms">
      <Chip kind="select" size="small" variant="weak" shape="pill" margin="none" wrap={false}>
        {PRIMARY_PLATFORMS.map((item) => (
          <ChipItem
            key={item}
            selected={value === item}
            onClick={() => onChange(item)}
          >
            {PLATFORM_LABELS[item]}
          </ChipItem>
        ))}
        <ChipItem
          selected={moreSelected}
          onClick={openMoreSheet}
          aria-label="더보기 플랫폼"
        >
          …
        </ChipItem>
      </Chip>
    </div>
  )
}
