import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

/**
 * GET /store/products/search
 *
 * Tamami sunucu tarafinda yapilan katalog aramasi/listeleme:
 *   q, platform, genre, price_min, price_max (USD maj or), sort_by, limit, offset
 *
 * 78k+ urun olceginde client-side filtreleme yapilamayacagi icin filtre,
 * siralama ve sayfalama tek SQL sorgusunda gerceklestirilir (product ->
 * variant -> price_set -> price (usd) birlestirimi). Sonuca dusen id'ler
 * icin sadece sayfa metadatasi modulden cekilir.
 *
 * Kisitlar:
 *   - limit en fazla 100 (sayfalama zorunlu, tum liste tek istekte inmez)
 *   - offset en fazla 10000
 *   - q en az 2 karakter
 */

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20
const MAX_OFFSET = 10000
const MIN_QUERY_LENGTH = 2
const BASE_CURRENCY = 'usd'

function clampInt(raw: any, min: number, max: number, fallback: number): number {
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const db = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
    const storeSettings = req.scope.resolve('storeSettings') as any

    const {
      q,
      id,
      handle,
      platform,
      genre,
      collection_id,
      category_id,
      price_min,
      price_max,
      sort_by,
    } = req.query

    const limit = clampInt(req.query.limit, 1, MAX_LIMIT, DEFAULT_LIMIT)
    const offset = clampInt(req.query.offset, 0, MAX_OFFSET, 0)

    // ---------- WHERE / JOIN kurgusu ----------
    const where: string[] = [
      `p.status = 'published'`,
      `p.deleted_at IS NULL`,
    ]
    const params: any[] = []

    // Eger tekil urun (id veya handle) aranmiyorsa, gecerli USD fiyati olanlari listele
    if (!id && !handle) {
      where.push(`pr.currency_code = '${BASE_CURRENCY}'`)
      where.push(`pr.amount > 0`)
    }

    if (id && String(id).trim()) {
      where.push(`p.id = ?`)
      params.push(String(id).trim())
    }

    if (handle && String(handle).trim()) {
      where.push(`p.handle = ?`)
      params.push(String(handle).trim())
    }

    const search = q && String(q).trim().length >= MIN_QUERY_LENGTH ? String(q).trim() : null
    if (search) {
      where.push(`(p.title ILIKE ? OR p.description ILIKE ?)`)
      const like = `%${search}%`
      params.push(like, like)
    }

    if (platform && String(platform).trim()) {
      where.push(`p.metadata->>'platform' = ?`)
      params.push(String(platform).trim())
    }

    if (genre && String(genre).trim()) {
      where.push(`p.metadata->'genres' @> ?::jsonb`)
      params.push(JSON.stringify([String(genre).trim()]))
    }

    if (collection_id && String(collection_id).trim()) {
      where.push(`(p.collection_id = ? OR p.metadata->>'platform' ILIKE (SELECT title FROM product_collection WHERE id = ?))`)
      params.push(String(collection_id).trim(), String(collection_id).trim())
    }

    if (category_id && String(category_id).trim()) {
      where.push(`(
        EXISTS (
          SELECT 1 FROM product_category_product pcp 
          WHERE pcp.product_id = p.id AND pcp.product_category_id = ?
        )
        OR p.metadata->'genres' @> (
          SELECT jsonb_build_array(name) FROM product_category WHERE id = ?
        )
      )`)
      params.push(String(category_id).trim(), String(category_id).trim())
    }

    // Fiyat filtreleri USD minor unit (kurus) uzerinden
    const having: string[] = []
    const havingParams: any[] = []
    const priceMin = Number(price_min)
    const priceMax = Number(price_max)
    if (Number.isFinite(priceMin) && priceMin > 0) {
      having.push(`MIN(pr.amount) >= ?`)
      havingParams.push(Math.round(priceMin * 100))
    }
    if (Number.isFinite(priceMax) && priceMax > 0) {
      having.push(`MIN(pr.amount) <= ?`)
      havingParams.push(Math.round(priceMax * 100))
    }

    // ---------- Siralama ----------
    let orderBy: string
    switch (String(sort_by || '')) {
      case 'price_asc':
      case 'low-high':
        orderBy = `ORDER BY price ASC, p.created_at DESC`
        break
      case 'price_desc':
      case 'high-low':
        orderBy = `ORDER BY price DESC, p.created_at DESC`
        break
      case 'name':
      case 'a-z':
        orderBy = `ORDER BY p.title ASC`
        break
      case 'newest':
        orderBy = `ORDER BY p.created_at DESC`
        break
      default:
        // alaka: once baslikta gecenler, sonra en yeni
        if (search) {
          where.push(`p.title ILIKE ?`)
          params.push(`%${search}%`)
          orderBy = `ORDER BY title_hit DESC, p.created_at DESC`
        } else {
          orderBy = `ORDER BY p.created_at DESC`
        }
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const havingSql = having.length ? `HAVING ${having.join(' AND ')}` : ''

    const fromSql = `
      FROM product p
      JOIN product_variant v ON v.product_id = p.id AND v.deleted_at IS NULL
      LEFT JOIN product_variant_price_set vps ON vps.variant_id = v.id AND vps.deleted_at IS NULL
      LEFT JOIN price pr ON pr.price_set_id = vps.price_set_id AND pr.currency_code = '${BASE_CURRENCY}'
    `

    // ---------- Toplam sayi ----------
    const totalRes = await db.raw(
      `SELECT COUNT(*) AS total FROM (
         SELECT p.id
         ${fromSql}
         ${whereSql}
         GROUP BY p.id
         ${havingSql}
       ) sub`,
      [...params, ...havingParams]
    )
    const total = Number(totalRes.rows?.[0]?.total || 0)

    if (total === 0) {
      return res.json({
        products: [],
        count: 0,
        limit,
        offset,
        query: search || null,
      })
    }

    // ---------- Sayfanin id listesi (sirali) ----------
    const idRes = await db.raw(
      `SELECT p.id, COALESCE(MIN(pr.amount), 0) AS price, (p.title ILIKE ?) AS title_hit
       ${fromSql}
       ${whereSql}
       GROUP BY p.id
       ${havingSql}
       ${orderBy}
       LIMIT ? OFFSET ?`,
      [search ? `%${search}%` : '%', ...params, ...havingParams, limit, offset]
    )
    const rows: Array<{ id: string; price: number }> = idRes.rows || []

    if (!rows.length) {
      return res.json({
        products: [],
        count: total,
        limit,
        offset,
        query: search || null,
      })
    }

    // ---------- Sayfa verisi ----------
    const ids = rows.map((r) => r.id)
    const priceById = new Map(rows.map((r) => [r.id, Number(r.price)]))

    const products = await productModule.listProducts(
      { id: ids },
      { relations: ['variants', 'images', 'collection', 'categories'], take: ids.length }
    )

    const byId = new Map<string, any>(
      (products || []).map((p: any): [string, any] => [p.id, p])
    )

    // hide_zero_stock admin ayari: stoksuzlari sayfadan at (sayfa sayisi yaklasik olur)
    let hideZeroStock = false
    try {
      const raw = await storeSettings.getSettingValue('catalog.hide_zero_stock', false)
      hideZeroStock = raw === true || raw === 'true'
    } catch {
      /* varsayilan */
    }

    let shaped = rows
      .map((r) => {
        const p = byId.get(r.id)
        if (!p) return null
        const amount = priceById.get(r.id) || 0
        return {
          id: p.id,
          title: p.title,
          handle: p.handle,
          description: p.description,
          thumbnail: p.thumbnail,
          metadata: p.metadata,
          collection_id: p.collection_id ?? null,
          collection: p.collection ?? null,
          categories: p.categories || [],
          images: p.images || [],
          // USD baz fiyat; storefront kur ile cevirir
          display_price: { amount, currency_code: BASE_CURRENCY },
          variants: (p.variants || []).map((v: any) => ({
            id: v.id,
            title: v.title,
            prices: [{ amount, currency_code: BASE_CURRENCY }],
          })),
        }
      })
      .filter((p): p is any => p !== null)

    if (hideZeroStock && !handle && !id && shaped.length) {
      try {
        const keyInventoryService = req.scope.resolve('keyInventory') as any
        const checks = await Promise.all(
          shaped.map(async (p: any) => ({
            p,
            stock: await keyInventoryService.getInventoryCount(p.id).catch(() => 0),
          }))
        )
        shaped = checks.filter(({ stock }) => stock > 0).map(({ p }) => p)
      } catch (e: any) {
        console.warn('[Product search] stok filtresi atlandi:', e?.message)
      }
    }

    res.json({
      products: shaped,
      count: total,
      limit,
      offset,
      query: search || null,
    })
  } catch (error: any) {
    console.error('Product search error:', error)
    res.status(500).json({
      message: 'Failed to search products',
      error: error.message,
    })
  }
}
