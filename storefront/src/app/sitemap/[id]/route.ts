import { getSitemapChunk, sitemapResponse, sitemapUnavailable } from '@/lib/sitemap-server'

/**
 * GET /sitemap/{id}.xml — id 0: statik sayfalar, koleksiyonlar ve blog;
 * id >= 1: urunler (her parca PRODUCT_CHUNK_SIZE urun, bkz. sitemap-server.ts).
 *
 * Gecersiz id 404; backend'e ulasilamiyorsa ve onbellekte kopya yoksa 503
 * (arama motoru bos urlset gormez). robots.txt ve /sitemap.xml indeksi bu
 * adresleri listeler.
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Dinamik segment uzantiyi da icerir: /sitemap/3.xml -> id = "3.xml"
  const match = /^(\d{1,6})\.xml$/.exec(id)
  if (!match) {
    return new Response('Not Found', { status: 404 })
  }

  const chunk = await getSitemapChunk(Number(match[1]))
  return chunk ? sitemapResponse(chunk) : sitemapUnavailable()
}
