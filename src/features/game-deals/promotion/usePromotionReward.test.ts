import { afterEach, describe, expect, it, vi } from 'vitest'
import { grantPromotionReward } from '@apps-in-toss/web-framework'
import { grantEntryPromotionReward } from './usePromotionReward'

vi.mock('@apps-in-toss/web-framework', () => ({ grantPromotionReward: vi.fn() }))

const grant = vi.mocked(grantPromotionReward)

afterEach(() => {
  localStorage.clear()
  grant.mockReset()
})

describe('grantEntryPromotionReward', () => {
  it('지급에 성공하면 기록해 두고, 같은 기기에서는 다시 요청하지 않는다', async () => {
    grant.mockResolvedValue({ key: 'reward-key' } as never)

    await expect(grantEntryPromotionReward('CODE_A', 5)).resolves.toEqual({
      status: 'granted',
      key: 'reward-key',
    })
    await expect(grantEntryPromotionReward('CODE_A', 5)).resolves.toEqual({
      status: 'already-granted',
    })
    expect(grant).toHaveBeenCalledTimes(1)
  })

  it('동시에 두 번 호출돼도 API는 한 번만 부른다', async () => {
    grant.mockResolvedValue({ key: 'reward-key' } as never)

    const [first, second] = await Promise.all([
      grantEntryPromotionReward('CODE_B', 5),
      grantEntryPromotionReward('CODE_B', 5),
    ])

    expect(first.status).toBe('granted')
    expect(second.status).toBe('already-granted')
    expect(grant).toHaveBeenCalledTimes(1)
  })

  it('지원하지 않는 앱 버전이면 기록하지 않아 다음 진입 때 다시 시도한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    grant.mockResolvedValue(undefined as never)

    await expect(grantEntryPromotionReward('CODE_C', 5)).resolves.toEqual({ status: 'unsupported' })
    await grantEntryPromotionReward('CODE_C', 5)
    expect(grant).toHaveBeenCalledTimes(2)
  })

  it('localStorage 접근이 막힌 환경에서도 예외 없이 동작한다', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    grant.mockResolvedValue({ key: 'reward-key' } as never)

    await expect(grantEntryPromotionReward('CODE_D', 5)).resolves.toEqual({
      status: 'granted',
      key: 'reward-key',
    })
  })
})
