import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function loadModule() {
  vi.resetModules()
  return import('./cheapSharkRequest')
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cheapSharkJson', () => {
  it('같은 요청은 캐시에서 돌려주고 네트워크는 한 번만 탄다', async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ dealID: '1' }]))
    vi.stubGlobal('fetch', fetchMock)
    const { cheapSharkJson } = await loadModule()

    await expect(cheapSharkJson('/deals?x=1')).resolves.toEqual([{ dealID: '1' }])
    await expect(cheapSharkJson('/deals?x=1')).resolves.toEqual([{ dealID: '1' }])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('429는 재시도하지 않고 안내 메시지와 함께 실패한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 429)))
    const { cheapSharkJson, GameDealApiError } = await loadModule()

    const error = await cheapSharkJson('/deals?x=2').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(GameDealApiError)
    expect(error).toMatchObject({ status: 429 })
  })

  it('200이어도 본문에 error가 있으면 실패로 처리한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Rate limited' })))
    const { cheapSharkJson } = await loadModule()

    await expect(cheapSharkJson('/deals?x=3')).rejects.toThrow('Rate limited')
  })
})
