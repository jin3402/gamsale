/**
 * 앱을 새로 열 때마다(모듈이 다시 로드될 때마다) 값이 바뀌는 시드예요.
 * 같은 세션 안에서는 값이 유지돼서, 탭을 왔다갔다 해도 순서가 흔들리지 않아요.
 */
const SESSION_SEED = Date.now() + Math.floor(Math.random() * 1_000_000)

function createRandom(seed: number) {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646

  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/** 시드 기반 Fisher–Yates 셔플. 같은 세션에서는 같은 입력에 대해 항상 같은 결과를 줘요. */
export function shuffleForSession<T>(items: T[], seed = SESSION_SEED): T[] {
  const result = [...items]
  const random = createRandom(seed)

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}
