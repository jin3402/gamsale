/**
 * 닌텐도(및 필요 시 콘솔) 목록에서 성인·선정성·저품질 게임을 걸러요.
 * 토스 미니앱 검수에서 선정성 콘텐츠는 반려 사유가 될 수 있어서 보수적으로 필터링해요.
 */

const ADULT_OR_SUGGESTIVE =
  /(Hentai|Ecchi|Nude|NSFW|R-?18|18\+|Adult|エロ|アダルト|同人|성인|야한|누드|탈의|노출|착의|변태|음란|음행|능욕|조교|착정|사정|중출|촉수|NTR|寝取|人妻|痴漢|痴女|風俗|ソープ|援交|巨乳|貧乳|おっぱい|ヌード|裸|Harem|Succubus|Bikini|Lingerie|Fetish|Oppai|Boob|Pussy|Sex\b|Slave|Seduction|Temptation|Locker Room|Photo Girls|Good Girls|Steam Girls|Jigsaw Girls|Bad Girls|Puzzle Girls|Pool Party Girls|Splash Babes|Wild Desire|Pleasure|Deeper|Flip-Flip|Anime (Boys|Girls)|Anime Codex|Final Pose|No Retouch|Raw Photo|Cute Girls|Kawaii Anime|Gallery Unlock|갤러리 해금|Babe|Dating Sim|Waifu|Wife|Husband|Nurse|Maid|Seven Deadly Sins|LoveR|Hidden Legends)/i

const LOW_QUALITY_JUNK =
  /(공포 심리|위치전설|상식 배틀|명화|있을 리 없는|Quiz|Trivia|Jigsaw|Coloring Book|Wallpaper|Photo Album)/i

/** 제목이 성인·선정성이면 true */
export function isAdultOrSuggestiveTitle(title: string) {
  return ADULT_OR_SUGGESTIVE.test(title)
}

/** 닌텐도 목록에 올리면 안 되는 제목이면 true */
export function isBlockedNintendoTitle(title: string) {
  const normalized = title.replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim()
  return ADULT_OR_SUGGESTIVE.test(normalized) || LOW_QUALITY_JUNK.test(normalized)
}

/** 닌텐도 딜 배열에서 차단 제목을 제거해요. */
export function filterSafeNintendoDeals<T extends { title: string }>(deals: T[]): T[] {
  return deals.filter((deal) => !isBlockedNintendoTitle(deal.title))
}
