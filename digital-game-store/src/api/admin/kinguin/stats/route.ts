import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/kinguin/stats
 * Dashboard kartlari icin tek kaynaktan sayilar: DB urun sayisi, yayindaki
 * urun sayisi ve Kinguin katalog/liste/baglanti sayilari.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const productModule = req.scope.resolve("product") as any

  async function countKinguin(filters: Record<string, any> = {}): Promise<number> {
    try {
      if (typeof kinguin.listAndCountKinguinProducts === "function") {
        const [, count] = await kinguin.listAndCountKinguinProducts(filters, { take: 1 })
        return Number(count || 0)
      }
    } catch {
      // fallback
    }
    const rows = await kinguin.listKinguinProducts(filters)
    return rows.length
  }

  let products = 0
  let published = 0
  try {
    const [, total] = await productModule.listAndCountProducts({}, { take: 1 })
    products = Number(total || 0)
    const [, pub] = await productModule.listAndCountProducts({ status: "published" }, { take: 1 })
    published = Number(pub || 0)
  } catch {
    // sayilar 0 kalir; admin panelde uyari gosterilir
  }

  const [catalog, listed, linked, inStock] = await Promise.all([
    countKinguin({}),
    countKinguin({ store_listed: true }),
    countKinguin({ medusa_product_id: { $ne: null } }),
    countKinguin({ qty: { $gt: 0 } }),
  ])

  res.json({
    products,
    published,
    catalog,
    listed,
    linked,
    in_stock: inStock,
    unlisted: Math.max(0, catalog - listed),
    // Magaza urunlerinden Kinguin katalog kaydina baglanamayanlar
    // (catalog'da birebir karsiligi yok veya kayit baska urune bagli).
    products_unlinked: Math.max(0, products - linked),
  })
}
