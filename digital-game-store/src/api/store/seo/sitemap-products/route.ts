import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

/**
 * GET /store/seo/sitemap-products?offset=0&limit=5000
 * Sitemap uretimi icin yayinlanmis urunlerin handle + updated_at listesini
 * parcalar halinde dondurur. 78k+ urun tek istekte cekilemeyecegi icin
 * storefront generateSitemaps bu endpoint'i parca parca cagirir.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0)
    const limit = Math.min(20000, Math.max(1, parseInt(String(req.query.limit ?? '5000'), 10) || 5000))

    const rows = await db.raw(
      `SELECT handle, updated_at
       FROM product
       WHERE status = 'published' AND deleted_at IS NULL AND handle IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    )

    const totalRes = await db.raw(
      `SELECT COUNT(*) AS total FROM product WHERE status = 'published' AND deleted_at IS NULL AND handle IS NOT NULL`
    )
    const total = Number(totalRes.rows?.[0]?.total || 0)

    res.json({
      products: (rows.rows || []).map((r: any) => ({
        handle: r.handle,
        updated_at: r.updated_at,
      })),
      offset,
      limit,
      total,
    })
  } catch (error: any) {
    console.error('Sitemap products error:', error)
    res.status(500).json({ message: 'Failed to fetch sitemap products', error: error.message })
  }
}
