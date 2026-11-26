import { getSitemapIndex, sitemapResponse, sitemapUnavailable } from '@/lib/sitemap-server'

/**
 * GET /sitemap.xml — sitemap indeksi. Parcalar:
 *   /sitemap/0.xml      statik sayfalar + koleksiyonlar + blog
 *   /sitemap/1..N.xml   urunler (N katalog boyutundan turetilir, sabit degil)
 *
 * Route handler olarak yazildi: app/sitemap.ts + generateSitemaps kurali indeks
 * uretmez (/sitemap.xml 404 doner), id'yi Promise gecer ve Docker build'i
 * sirasinda backend'e ulasilamayinca bos parcalari imaja on-isler.
 * force-dynamic her istekte calistirir; onbellek sitemap-server icinde.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const index = await getSitemapIndex()
  return index ? sitemapResponse(index) : sitemapUnavailable()
}
