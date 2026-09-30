/**
 * 빌드 시 Nintendo / PlayStation / Xbox 할인 목록을 미리 받아
 * 토스 WebView(CORS 차단)에서도 보여줄 수 있게 저장해요.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeHtmlEntities, isBlockedNintendoTitle } from '../src/features/game-deals/api/contentRules.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../src/features/game-deals/api/snapshots')
const MIN_DISCOUNT = 20
const DEAL_LIMIT = 150

const PS_CATEGORY_ID = '3f772501-f6f8-49b7-abac-874a88ca4897'
const PS_HASH = '9845afc0dbaab4965f6563fffc703f588c8e76792000e8610843b8d3ee9c4c09'

function parseWon(text) {
  const value = Number(String(text).replace(/[^\d]/g, ''))
  return Number.isFinite(value) ? value : 0
}

function discountPercent(original, sale) {
  if (original <= 0 || sale < 0 || sale >= original) return 0
  return Math.round((1 - sale / original) * 100)
}

function parseMoneyAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const match = value.replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/)
  return match ? Number(match[1]) : null
}

async function fetchNintendo() {
  const paths = [
    '/digital/sale',
    '/digital/sale?p=2',
    '/digital/sale?p=3',
    '/digital/sale?p=4',
    '/digital/sale?p=5',
    '/digital/sale?p=6',
    '/digital/sale?p=7',
    '/digital/sale?p=8',
    '/digital/sale?price=15000.00-0.00',
    '/digital/best-sellers',
  ]

  const byId = new Map()

  for (const path of paths) {
    const response = await fetch(`https://store.nintendo.co.kr${path}`, {
      headers: {
        Accept: 'text/html',
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
    })
    if (!response.ok) {
      console.warn(`[snapshot] nintendo ${path} -> ${response.status}`)
      continue
    }
    const html = await response.text()
    const cards = html.match(/<li class="item product product-item"[\s\S]*?<\/li>/g) ?? []

    for (const card of cards) {
      const href = card.match(/href="(https:\/\/store\.nintendo\.co\.kr\/(7001\d{10}))"/)
      const title = card.match(/product-item-link[^>]*>\s*([^<]+)/)
      const special = card.match(/class="special-price"[\s\S]*?<span class="price">([^<]+)/)
      const old = card.match(/class="old-price"[\s\S]*?<span class="price">([^<]+)/)
      const img = card.match(/<img class="product-image-photo"[^>]*src="([^"]+)"/)
      if (!href || !title || !special || !old) continue

      const name = decodeHtmlEntities(title[1].trim())
      if (isBlockedNintendoTitle(name)) continue

      const originalPrice = parseWon(old[1])
      const salePrice = parseWon(special[1])
      const rate = discountPercent(originalPrice, salePrice)
      if (rate < MIN_DISCOUNT || salePrice <= 0) continue

      byId.set(href[2], {
        id: `switch-${href[2]}`,
        title: name,
        platform: 'Nintendo Switch',
        thumbnailUrl: img?.[1] ?? '',
        originalPrice,
        salePrice,
        discountRate: rate,
        dealUrl: href[1],
      })
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.discountRate - a.discountRate)
    .slice(0, DEAL_LIMIT)
}

async function fetchPlayStation() {
  const byId = new Map()

  for (const offset of [0, 24, 48, 72, 96, 120, 144]) {
    const variables = {
      id: PS_CATEGORY_ID,
      pageArgs: { size: 24, offset },
    }
    const extensions = {
      persistedQuery: { version: 1, sha256Hash: PS_HASH },
    }
    const params = new URLSearchParams({
      operationName: 'categoryGridRetrieve',
      variables: JSON.stringify(variables),
      extensions: JSON.stringify(extensions),
    })

    const response = await fetch(
      `https://web.np.playstation.com/api/graphql/v1/op?${params}`,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-apollo-operation-name': 'categoryGridRetrieve',
          'X-PSN-Store-Locale-Override': 'en-US',
          Origin: 'https://store.playstation.com',
          Referer: 'https://store.playstation.com/',
        },
      },
    )

    if (!response.ok) {
      console.warn(`[snapshot] playstation offset=${offset} -> ${response.status}`)
      continue
    }

    const payload = await response.json()
    const products = payload?.data?.categoryGridRetrieve?.products ?? []

    for (const product of products) {
      const title = product?.name?.trim()
      const id = product?.id
      if (!title || !id) continue
      if (/(Cash Card|Season Pass|Add-On|Avatar|Theme|Currency|Points)/i.test(title)) continue

      const originalUsd = parseMoneyAmount(product?.price?.basePrice)
      const saleUsd = parseMoneyAmount(product?.price?.discountedPrice)
      if (originalUsd == null || saleUsd == null || saleUsd <= 0) continue
      if (product?.price?.isFree) continue

      const rate = discountPercent(originalUsd, saleUsd)
      if (rate < MIN_DISCOUNT) continue

      const media = (product.media ?? []).filter((m) => m.type === 'IMAGE' && m.url)
      const thumb =
        media.find((m) => m.role === 'MASTER')?.url ||
        media.find((m) => m.role === 'GAMEHUB_COVER_ART')?.url ||
        media.find((m) => m.role === 'LOGO')?.url ||
        media[0]?.url
      if (!thumb) continue

      // 스냅샷은 USD 기준 원화 환산(대략). 런타임에서 환율 재적용은 어려워 빌드 시점 고정.
      const usdKrw = Number(process.env.VITE_USD_KRW_RATE ?? 1450)
      byId.set(id, {
        id: `ps-${id}`,
        title,
        platform: 'PlayStation',
        thumbnailUrl: thumb,
        endsAt: product?.price?.endTime || undefined,
        originalPrice: Math.round(originalUsd * usdKrw),
        salePrice: Math.round(saleUsd * usdKrw),
        discountRate: rate,
        dealUrl: `https://store.playstation.com/en-us/product/${id}`,
      })
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.discountRate - a.discountRate)
    .slice(0, DEAL_LIMIT)
}

const XBOX_QUERIES = [
  'forza',
  'halo',
  'gears',
  'starfield',
  'assassin',
  'minecraft',
  'doom',
  'resident evil',
  'witcher',
  'cyberpunk',
  'ori',
  'grounded',
  'sea of thieves',
  'hi-fi rush',
  'flight simulator',
  'red dead',
  'elden',
  'diablo',
  'call of duty',
  'tomb raider',
  'action',
  'rpg',
  'racing',
  'horror',
  'indie',
  'deal',
  'sale',
]

function walkXboxProducts(node, out, depth = 0) {
  if (!node || depth > 14) return
  if (Array.isArray(node)) {
    for (const child of node.slice(0, 120)) walkXboxProducts(child, out, depth + 1)
    return
  }
  if (typeof node !== 'object') return
  if (node.Title && node.ProductId && typeof node.Price === 'number') out.push(node)
  for (const value of Object.values(node)) walkXboxProducts(value, out, depth + 1)
}

function resolveXboxPrices(product) {
  for (const sku of product.SkusSummary ?? []) {
    const msrp = sku.MSRP
    if (typeof msrp !== 'number' || msrp <= 0) continue
    let sale = null
    for (const salePrice of sku.SalePrices ?? []) {
      if (
        typeof salePrice.Price === 'number' &&
        salePrice.Price > 0 &&
        (salePrice.BadgeId == null || salePrice.BadgeId === 'default')
      ) {
        sale = salePrice.Price
        break
      }
    }
    if (sale == null && typeof product.Price === 'number' && product.Price > 0) {
      sale = product.Price
    }
    if (sale != null && sale > 0 && sale < msrp) {
      return { originalUsd: msrp, saleUsd: sale }
    }
  }
  return null
}

function pickXboxThumb(images) {
  if (!images?.length) return ''
  const preferred =
    images.find((image) => /poster/i.test(image.ImageType ?? '')) ||
    images.find((image) => /boxart|hero|superhero/i.test(image.ImageType ?? '')) ||
    images[0]
  return preferred?.Url ?? ''
}

async function fetchXbox() {
  const byId = new Map()
  const usdKrw = Number(process.env.VITE_USD_KRW_RATE ?? 1450)

  for (const query of XBOX_QUERIES) {
    const params = new URLSearchParams({
      market: 'US',
      locale: 'en-US',
      deviceFamily: 'Windows.Xbox',
      query,
    })
    const response = await fetch(
      `https://storeedgefd.dsx.mp.microsoft.com/v9.0/pages/searchResults?${params}`,
      { headers: { Accept: 'application/json' } },
    )
    if (!response.ok) {
      console.warn(`[snapshot] xbox query=${query} -> ${response.status}`)
      continue
    }

    const products = []
    walkXboxProducts(await response.json(), products)

    for (const product of products) {
      const id = product.ProductId
      const title = product.Title?.trim()
      if (!id || !title) continue
      if (/(Netflix|YouTube|Spotify|Disney|Hulu|Prime Video|App)/i.test(title)) continue

      const priced = resolveXboxPrices(product)
      if (!priced) continue

      const rate = discountPercent(priced.originalUsd, priced.saleUsd)
      if (rate < 10) continue

      const thumb = pickXboxThumb(product.Images)
      if (!thumb) continue

      const prev = byId.get(id)
      if (prev && prev.discountRate >= rate) continue

      byId.set(id, {
        id: `xbox-${id}`,
        title,
        platform: 'Xbox',
        thumbnailUrl: thumb,
        originalPrice: Math.round(priced.originalUsd * usdKrw),
        salePrice: Math.round(priced.saleUsd * usdKrw),
        discountRate: rate,
        dealUrl: `https://www.xbox.com/en-US/games/store/a/${id}`,
      })
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.discountRate - a.discountRate)
    .slice(0, DEAL_LIMIT)
}

function readPreviousSnapshot() {
  const filePath = join(outDir, 'consoleDeals.ts')
  if (!existsSync(filePath)) return null
  const source = readFileSync(filePath, 'utf8')
  const match = source.match(/=\s*(\{[\s\S]*\})\s*$/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  const previous = readPreviousSnapshot()

  const [nintendoLive, playstationLive, xboxLive] = await Promise.all([
    fetchNintendo().catch((error) => {
      console.warn('[snapshot] nintendo failed', error)
      return []
    }),
    fetchPlayStation().catch((error) => {
      console.warn('[snapshot] playstation failed', error)
      return []
    }),
    fetchXbox().catch((error) => {
      console.warn('[snapshot] xbox failed', error)
      return []
    }),
  ])

  const nintendo =
    nintendoLive.length > 0 ? nintendoLive : (previous?.nintendo ?? [])
  const playstation =
    playstationLive.length > 0 ? playstationLive : (previous?.playstation ?? [])
  const xbox = xboxLive.length > 0 ? xboxLive : (previous?.xbox ?? [])

  if (nintendoLive.length === 0 && previous?.nintendo?.length) {
    console.warn('[snapshot] nintendo empty — kept previous snapshot')
  }
  if (playstationLive.length === 0 && previous?.playstation?.length) {
    console.warn('[snapshot] playstation empty — kept previous snapshot')
  }
  if (xboxLive.length === 0 && previous?.xbox?.length) {
    console.warn('[snapshot] xbox empty — kept previous snapshot')
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    nintendo,
    playstation,
    xbox,
  }

  const ts = `/* eslint-disable */
/** 자동 생성: npm run snapshot:deals — 수동 수정하지 마세요. */
import type { GameDeal } from '../../types'

export const consoleDealSnapshot: {
  generatedAt: string
  nintendo: GameDeal[]
  playstation: GameDeal[]
  xbox: GameDeal[]
} = ${JSON.stringify(payload, null, 2)}
`

  writeFileSync(join(outDir, 'consoleDeals.ts'), ts)
  console.log(
    `[snapshot] saved nintendo=${nintendo.length} playstation=${playstation.length} xbox=${xbox.length} -> snapshots/consoleDeals.ts`,
  )

  if (nintendo.length === 0 && playstation.length === 0 && xbox.length === 0) {
    console.warn('[snapshot] all empty — check network / store availability')
    process.exitCode = 1
  }
}

await main()
