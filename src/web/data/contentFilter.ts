/**
 * 웹 사이트용 성인·선정성 게임 필터.
 *
 * 노출·성적 요소가 "중심"인 게임만 걸러요. 메이드·연애·호러처럼 소재만 비슷한 일반 게임은
 * 남기려고, 단어 하나(예: Wife, Maid, Desire)가 아니라 장르 패턴과 실제로 확인한 제목으로 판단해요.
 * (미니앱은 토스 검수 기준에 맞춘 features/game-deals/api/contentFilter.ts를 따로 써요)
 */

/** 영어권에서 성인 게임임을 직접 드러내는 단어 */
const EXPLICIT =
  /\b(hentai|ecchi|nsfw|nude|nudity|naked|uncensored|porn|porno|xxx|lewd|erotic|erotica|fetish|succubus|harem|waifus?|oppai|boobs?|busty|lingerie|bikini|swimsuit|strip poker|sex|sexy|r-?18)\b|18\+/i

/** "Fashion Girls", "Pool Party Boys" 같은 사진·퍼즐형 선정성 장르 */
const SUGGESTIVE_GENRE =
  /\b(fashion|model|elegant|photo|cute|anime|naughty|hot|kawaii|bad|good|puzzle|jigsaw|steam|beach volleyball|pool party)\s+(girls?|babes?)\b|\b(hot|beach volleyball|pool party)\s+(boys|guys)\b/i

/** 제목만으로는 애매해서 썸네일까지 확인하고 넣은 시리즈 */
const KNOWN_TITLES =
  /(dirty little puzzle|yummy girl|forbidden desire|secret affair|hot spike|splash (guys|babes)|sakura (hime|beach|swim club|spirit|angels|succubus|dungeon|santa|gamer|cupid))/i

/** 한국어 제목 — '성인'은 성인(聖人)과 겹쳐서 '성인용'만, '미녀'는 '미녀와 야수'를 피해서 '미녀들/미녀의'만 봐요 */
const KOREAN =
  /(미소녀|미녀들|미녀의|여친|비키니|수영복|섹시|야한|성인용|누드|탈의|음란|에로|갸루|금단의 욕망|비치발리볼|풀 파티|핫 스파이크|트로피컬 아이 리조트|그 시선, 들켰어요)/

const JAPANESE = /(エロ|アダルト|ヌード|裸|巨乳|おっぱい|痴漢|痴女|寝取|人妻)/

/** 위 패턴에 걸리지만 일반 게임인 제목 */
const ALLOWED = /(the sexy brutale|bikini bottom)/i

function normalize(title: string) {
  return title.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").normalize('NFKC')
}

/** 성인·선정성 위주 게임이면 true */
export function isAdultContent(title: string): boolean {
  const text = normalize(title)
  if (ALLOWED.test(text)) return false
  return (
    EXPLICIT.test(text) ||
    SUGGESTIVE_GENRE.test(text) ||
    KNOWN_TITLES.test(text) ||
    KOREAN.test(text) ||
    JAPANESE.test(text)
  )
}
