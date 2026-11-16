import type { MetadataRoute } from "next"
import { BLOG_POSTS } from "@/lib/blog-posts"

const API_URL =
  process.env.MEDUSA_BACKEND_URL_SERVER || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export const revalidate = 86400 // sitemap gunluk yenilenir

// Urun parca buyuklugu: 10000 (Google limiti 50k olsa da fetch suresi icin kucuk)
const PRODUCT_CHUNK_SIZE = 10000
// Tahmini parca sayisi: katalog ~80k + tampon. generateSitemaps statik liste
// istedigi icin sayiyi sabit tutup, bos parclar bos doner.
const PRODUCT_CHUNKS = 10

async function fetchStore<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {},
      next: { revalidate },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Parcali sitemap uretimi (78k+ urun Google'in 50k/sitemap limitine takilmadan):
 *   id 0        -> statik sayfalar + koleksiyonlar + blog
 *   id 1..N     -> urunler (her parca PRODUCT_CHUNK_SIZE handle)
 * /sitemap.xml index olarak uretilir; detaylar /sitemap/{id}.xml
 */
export async function generateSitemaps() {
  const ids = Array.from({ length: 1 + PRODUCT_CHUNKS }, (_, i) => ({ id: i }))
  return ids
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // ---- Parca 0: statik + koleksiyon + blog ----
  if (id === 0) {
    const staticRoutes: MetadataRoute.Sitemap = [
      "",
      "/products",
      "/categories",
      "/deals",
      "/how-it-works",
      "/faq",
      "/contact",
      "/privacy",
      "/terms",
      "/cookies",
      "/returns",
      "/delivery",
      "/blog",
      "/about",
    ].map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: path === "" ? 1 : 0.7,
    }))

    const collectionsRes = await fetchStore<{ collections: Array<{ handle?: string }> }>(
      "/store/collections?limit=100"
    )
    const collectionRoutes: MetadataRoute.Sitemap = (collectionsRes?.collections || [])
      .filter((c) => c.handle)
      .map((c) => ({
        url: `${SITE_URL}/categories/${c.handle}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      }))

    const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.6,
    }))

    return [...staticRoutes, ...collectionRoutes, ...blogRoutes]
  }

  // ---- Urun parcalari: id 1..PRODUCT_CHUNKS ----
  const offset = (id - 1) * PRODUCT_CHUNK_SIZE
  const products: MetadataRoute.Sitemap = []

  // Bulk endpoint tek istekte 10000 handle verir; network hatasinda parca bos doner
  // (bir sonraki revalidate'te tekrar denenir).
  const res = await fetchStore<{
    products: Array<{ handle: string; updated_at?: string }>
  }>(`/store/seo/sitemap-products?offset=${offset}&limit=${PRODUCT_CHUNK_SIZE}`)

  for (const p of res?.products || []) {
    if (!p.handle) continue
    products.push({
      url: `${SITE_URL}/products/${p.handle}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "daily",
      priority: 0.9,
    })
  }

  return products
}
