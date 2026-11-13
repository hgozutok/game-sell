import type { MetadataRoute } from "next"

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export const revalidate = 3600 // sitemap saatlik yenilenir

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/products",
    "/categories",
    "/deals",
    "/search",
    "/cart",
    "/login",
    "/register",
    "/faq",
    "/contact",
    "/how-it-works",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: path === "" ? 1 : 0.7,
  }))

  const productsRes = await fetchStore<{ products: Array<{ handle?: string; updated_at?: string }> }>(
    "/store/products?limit=1000&fields=handle,updated_at"
  )
  const productRoutes: MetadataRoute.Sitemap = (productsRes?.products || [])
    .filter((p) => p.handle)
    .map((p) => ({
      url: `${SITE_URL}/products/${p.handle}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "daily",
      priority: 0.9,
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

  return [...staticRoutes, ...productRoutes, ...collectionRoutes]
}
