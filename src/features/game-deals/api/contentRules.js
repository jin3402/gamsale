/**
 * 닌텐도 제목 필터·정규화 규칙.
 *
 * 빌드 시 스냅샷을 만드는 Node 스크립트(scripts/generate-deal-snapshots.mjs)와
 * 앱 런타임(contentFilter.ts, nintendoClient.ts)이 이 파일 하나를 같이 써요.
 * 예전에는 두 곳에 정규식을 복사해 두어서 규칙이 서로 달라진 적이 있어요.
 * Node에서 바로 import해야 해서 TypeScript가 아닌 JS로 두고, 타입은 contentRules.d.ts에 있어요.
 */

/** 토스 미니앱 검수에서 선정성 콘텐츠는 반려 사유가 될 수 있어서 보수적으로 걸러요. */
export const ADULT_OR_SUGGESTIVE =
  /(Hentai|Ecchi|Nude|NSFW|R-?18|18\+|Adult|エロ|アダルト|同人|성인|야한|누드|탈의|노출|착의|변태|음란|음행|능욕|조교|착정|사정|중출|촉수|NTR|寝取|人妻|痴漢|痴女|風俗|ソープ|援交|巨乳|貧乳|おっぱい|ヌード|裸|Harem|Succubus|Bikini|Lingerie|Fetish|Oppai|Boob|Pussy|Sex|Slave|Seduction|Temptation|Locker Room|Photo Girls|Good Girls|Steam Girls|Jigsaw Girls|Bad Girls|Puzzle Girls|Pool Party Girls|Splash Babes|Wild Desire|Pleasure|Deeper|Flip-Flip|Anime (Boys|Girls)|Anime Codex|Final Pose|No Retouch|Raw Photo|Cute Girls|Kawaii Anime|Gallery Unlock|갤러리 해금|Babe|Dating Sim|Waifu|Wife|Husband|Nurse|Maid|Seven Deadly Sins|LoveR|Hidden Legends)/i

export const LOW_QUALITY_JUNK =
  /(공포 심리|위치전설|상식 배틀|명화|있을 리 없는|Quiz|Trivia|Jigsaw|Coloring Book|Wallpaper|Photo Album)/i

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * 닌텐도 스토어 HTML에서 뽑은 제목에 남아 있는 `&#039;`, `&amp;` 같은 엔티티를 문자로 바꿔요.
 * 한 번만 디코딩해요. (`&amp;#039;` → `&#039;`)
 */
export function decodeHtmlEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X'
      const code = isHex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })
}

/** 닌텐도 목록에 올리면 안 되는 제목이면 true */
export function isBlockedNintendoTitle(title) {
  const normalized = decodeHtmlEntities(title).trim()
  return ADULT_OR_SUGGESTIVE.test(normalized) || LOW_QUALITY_JUNK.test(normalized)
}
