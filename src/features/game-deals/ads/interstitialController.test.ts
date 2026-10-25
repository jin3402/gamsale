import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework'
import { LIVE_INTERSTITIAL_AD_GROUP_ID, TEST_INTERSTITIAL_AD_GROUP_ID } from './adIds'
import { createInterstitialController, SHOW_TIMEOUT_MS } from './interstitialController'

vi.mock('@apps-in-toss/web-framework', () => {
  const load = Object.assign(vi.fn(() => () => {}), { isSupported: vi.fn(() => true) })
  const show = Object.assign(vi.fn(), { isSupported: vi.fn(() => true) })
  return { loadFullScreenAd: load, showFullScreenAd: show }
})

type LoadArgs = Parameters<typeof loadFullScreenAd>[0]
type ShowArgs = Parameters<typeof showFullScreenAd>[0]

const load = vi.mocked(loadFullScreenAd)
const show = vi.mocked(showFullScreenAd)

function lastLoad(): LoadArgs {
  return load.mock.calls.at(-1)![0]
}

function lastShow(): ShowArgs {
  return show.mock.calls.at(-1)![0]
}

beforeEach(() => {
  vi.useFakeTimers()
  load.mockClear()
  show.mockClear()
  vi.mocked(load.isSupported).mockReturnValue(true)
})

afterEach(() => {
  vi.useRealTimers()
})

async function startAndLoad() {
  const controller = createInterstitialController()
  controller.start()
  await vi.advanceTimersByTimeAsync(100)
  lastLoad().onEvent({ type: 'loaded' } as never)
  return controller
}

describe('createInterstitialController', () => {
  it('광고를 지원하지 않는 환경에서는 바로 다음 동작으로 넘어간다', () => {
    vi.mocked(load.isSupported).mockReturnValue(false)
    const controller = createInterstitialController()
    const onFinished = vi.fn()

    expect(controller.show(onFinished)).toBe(false)
    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(show).not.toHaveBeenCalled()
  })

  it('미리 로드된 광고를 보여주고, 닫히면 다음 동작을 한 번 실행한 뒤 다시 로드한다', async () => {
    const controller = await startAndLoad()
    expect(lastLoad().options?.adGroupId).toBe(LIVE_INTERSTITIAL_AD_GROUP_ID)

    const onFinished = vi.fn()
    expect(controller.show(onFinished)).toBe(true)
    expect(onFinished).not.toHaveBeenCalled()

    lastShow().onEvent({ type: 'dismissed' } as never)
    expect(onFinished).toHaveBeenCalledTimes(1)

    await vi.runAllTimersAsync()
    expect(load).toHaveBeenCalledTimes(2)
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  it('로드 전에 요청하면 로드되는 즉시 보여준다', async () => {
    const controller = createInterstitialController()
    controller.start()
    await vi.advanceTimersByTimeAsync(100)

    const onFinished = vi.fn()
    expect(controller.show(onFinished)).toBe(false)
    expect(show).not.toHaveBeenCalled()

    lastLoad().onEvent({ type: 'loaded' } as never)
    expect(show).toHaveBeenCalledTimes(1)

    lastShow().onEvent({ type: 'dismissed' } as never)
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  it('광고가 끝내 로드되지 않아도 일정 시간 뒤 다음 동작으로 넘어간다', async () => {
    const controller = createInterstitialController()
    controller.start()
    await vi.advanceTimersByTimeAsync(100)

    const onFinished = vi.fn()
    controller.show(onFinished)
    await vi.advanceTimersByTimeAsync(SHOW_TIMEOUT_MS - 1)
    expect(onFinished).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(onFinished).toHaveBeenCalledTimes(1)
  })

  it('라이브 광고 로드가 실패하면 테스트 광고 ID로 다시 시도한다', async () => {
    const controller = createInterstitialController()
    controller.start()
    await vi.advanceTimersByTimeAsync(100)

    lastLoad().onError(new Error('no fill'))
    await vi.advanceTimersByTimeAsync(300)
    expect(lastLoad().options?.adGroupId).toBe(TEST_INTERSTITIAL_AD_GROUP_ID)
    controller.dispose()
  })

  it('dispose 이후에는 예약된 첫 로드가 실행되지 않는다', async () => {
    const controller = createInterstitialController()
    controller.start()
    controller.dispose()
    await vi.advanceTimersByTimeAsync(1000)
    expect(load).not.toHaveBeenCalled()
  })
})
