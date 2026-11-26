import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/checkout", "/api", "/search", "/cart", "/login", "/register"],
    },
    // Tek indeks yeterli: parca sayisi (/sitemap/{id}.xml) katalog boyutuna
    // gore degistigi icin arama motorlari parcalari indeksten kesfeder.
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
