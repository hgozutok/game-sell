import { BLOG_POSTS } from '@/lib/blog-posts'

/**
 * Sitemap uretimi (sunucu tarafi) — /sitemap.xml (indeks) ve /sitemap/{id}.xml
 * (parcalar) route handler'larinin ortak kodu.
 *
 *   id 0     -> statik sayfalar + koleksiyonlar + blog
 *   id 1..N  -> urunler (her parca PRODUCT_CHUNK_SIZE urun; N katalog
 *               boyutundan turetilir ve indekste listelenir)
 */

// Sunucu tarafindan okunan backend adresi (konteynerde compose agi)
const API_URL =
  process.env.MEDUSA_BACKEND_URL_SERVER ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ''
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')

// Urun parca buyuklugu: 10000 (Google limiti 50k olsa da fetch suresi icin kucuk)
const PRODUCT_CHUNK_SIZE = 10000
// Indekse en fazla bu kadar urun parcasi yazilir (Google limiti: sitemap basina 50k sitemap)
const MAX_PRODUCT_CHUNKS = 5000
// Backend her parca icin en fazla saatte bir sorgulanir
const CACHE_TTL_MS = 60 * 60 * 1000

// Katalog/blog'dan bagimsiz herkese acik sayfalar
const STATIC_PATHS = [
  '',
  '/products',
  '/categories',
  '/deals',
  '/how-it-works',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
  '/cookies',
  '/returns',
  '/delivery',
  '/digital-product-policy',
  '/blog',
  '/about',
]

type SitemapEntry = {
  path: string
  lastModified?: string
  changeFrequency: 'daily' | 'weekly' | 'monthly'
  priority: number
}

export type CachedBody = { body: string; stale: boolean }

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {},
      cache: 'no-store',
    })
    if (!res.ok) {
      console.warn(`[sitemap] backend ${res.status}: ${path}`)
      return null
    }
    return (await res.json()) as T
  } catch (error) {
    console.warn('[sitemap] backend erisilemedi:', error)
    return null
  }
}

type CacheEntry = { body: string; expiresAt: number }
const cache = new Map<string, CacheEntry>()

/**
 * Suresi dolmamis kopya varsa onu dondurur; yoksa builder'i calistirir.
 * Builder null dondururse (backend hatasi) bayat kopya varsa o servis edilir
 * ki arama motorlari hicbir zaman bos/yanlis parca gormez. Kopya hic yoksa
 * null doner ve route 503 verir.
 */
async function cached(key: string, build: () => Promise<string | null>): Promise<CachedBody | null> {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) return { body: hit.body, stale: false }

  const body = await build()
  if (body === null) {
    return hit ? { body: hit.body, stale: true } : null
  }
  cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS })
  return { body, stale: false }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlset(entries: SitemapEntry[]): string {
  const urls = entries.map((entry) => {
    // lastmod yalniz gercek bir tarih varsa yazilir; sabit "simdi" degeri
    // arama motorlari tarafindan guvenilmez sayilir.
    const lastModified = entry.lastModified ? new Date(entry.lastModified) : null
    const lastmod =
      lastModified && !Number.isNaN(lastModified.getTime())
        ? `    <lastmod>${lastModified.toISOString()}</lastmod>\n`
        : ''
    return (
      `  <url>\n` +
      `    <loc>${escapeXml(`${SITE_URL}${entry.path}`)}</loc>\n` +
      lastmod +
      `    <changefreq>${entry.changeFrequency}</changefreq>\n` +
      `    <priority>${entry.priority}</priority>\n` +
      `  </url>\n`
    )
  })
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join('') +
    `</urlset>\n`
  )
}

function staticEntries(): SitemapEntry[] {
  return STATIC_PATHS.map((path) => ({
    path,
    changeFrequency: 'daily',
    priority: path === '' ? 1 : 0.7,
  }))
}

function blogEntries(): SitemapEntry[] {
  return BLOG_POSTS.map((post) => ({
    path: `/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))
}

/** Tum koleksiyonlar; Medusa sayfa limiti (100) asilirsa diger sayfalar da cekilir. */
async function fetchCollections(): Promise<{ handle: string; updated_at?: string }[] | null> {
  const PAGE_SIZE = 100
  const MAX_PAGES = 100
  const collections: { handle: string; updated_at?: string }[] = []
  let offset = 0

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchJson<{
      collections: { handle?: string; updated_at?: string }[]
    }>(`/store/collections?limit=${PAGE_SIZE}&offset=${offset}`)
    if (!data) return null

    for (const collection of data.collections) {
      if (collection.handle) {
        collections.push({ handle: collection.handle, updated_at: collection.updated_at })
      }
    }
    if (data.collections.length < PAGE_SIZE) return collections
    offset += PAGE_SIZE
  }
  return collections
}

export async function getSitemapIndex(): Promise<CachedBody | null> {
  return cached('index', async () => {
    // Urun parca sayisi katalog boyutundan turetilir; katalog buyudukce indeks
    // kendini gunceller (sabit parca sayisi urunleri disarida birakirdi).
    const probe = await fetchJson<{ total?: number }>('/store/seo/sitemap-products?offset=0&limit=1')
    if (!probe) return null

    const total = Math.max(0, Number(probe.total) || 0)
    const productChunks = Math.min(MAX_PRODUCT_CHUNKS, Math.ceil(total / PRODUCT_CHUNK_SIZE))
    const ids = [0, ...Array.from({ length: productChunks }, (_, i) => i + 1)]

    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      ids.map((id) => `  <sitemap>\n    <loc>${SITE_URL}/sitemap/${id}.xml</loc>\n  </sitemap>\n`).join('') +
      `</sitemapindex>\n`
    )
  })
}

export async function getSitemapChunk(id: number): Promise<CachedBody | null> {
  // ---- Parca 0: statik + koleksiyon + blog ----
  if (id === 0) {
    const chunk = await cached('chunk:0', async () => {
      const collections = await fetchCollections()
      if (!collections) return null

      return urlset([
        ...staticEntries(),
        ...collections.map((collection) => ({
          path: `/categories/${collection.handle}`,
          lastModified: collection.updated_at,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })),
        ...blogEntries(),
      ])
    })
    // Backend gecici olarak ulasilamaz ve onbellek bos: statik sayfalar ve blog
    // yine de listelenir (backend bagimli degiller).
    return chunk ?? { body: urlset([...staticEntries(), ...blogEntries()]), stale: false }
  }

  // ---- Urun parcalari: id 1..N ----
  const offset = (id - 1) * PRODUCT_CHUNK_SIZE
  return cached(`chunk:${id}`, async () => {
    const data = await fetchJson<{ products: { handle: string; updated_at?: string }[] }>(
      `/store/seo/sitemap-products?offset=${offset}&limit=${PRODUCT_CHUNK_SIZE}`
    )
    // Indeks parca sayisini katalog boyutundan turettigi icin dolu parca beklenir;
    // bos sonuc backend hatasi sayilir (503) yoksa bos urlset yayina giderdi.
    if (!data || data.products.length === 0) return null

    return urlset(
      data.products
        .filter((product) => product.handle)
        .map((product) => ({
          path: `/products/${product.handle}`,
          lastModified: product.updated_at,
          changeFrequency: 'daily' as const,
          priority: 0.9,
        }))
    )
  })
}

export function sitemapResponse(result: CachedBody): Response {
  return new Response(result.body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      ...(result.stale ? { Warning: '110 - "Response is stale"' } : {}),
    },
  })
}

export function sitemapUnavailable(): Response {
  return new Response('Sitemap temporarily unavailable', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '3600',
    },
  })
}
