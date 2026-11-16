import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

// Parcali sitemap urun chunk'lariyla ayni adet: sitemap.ts PRODUCT_CHUNKS
const SITEMAP_CHUNKS = 11 // id 0: statik, id 1..10: urunler

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/checkout", "/api", "/search", "/cart", "/login", "/register"],
    },
    // Prod pattern: /sitemap/{id}.xml (dev'de /sitemap.xml/{id})
    sitemap: Array.from({ length: SITEMAP_CHUNKS }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`),
  }
}
