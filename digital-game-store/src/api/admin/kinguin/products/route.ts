import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Yerel Kinguin katalog kayitlarini listeler (filtre + sayfalama).
// AUTH: varsayilan admin JWT — AUTHENTICATE=false KULLANILMAZ.

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const pricingSettings = req.scope.resolve("pricingSettings") as any

  const query = (req.query as any) || {}
  const page = Math.max(1, Number(query.page || 1))
  const limit = Math.min(100, Number(query.limit || 25))

  const filters: Record<string, any> = {}
  if (query.listed === "true") filters.store_listed = true
  if (query.listed === "false") filters.store_listed = false
  if (query.platform) filters.platform = query.platform
  if (query.pending === "true") filters.pending_price = { $ne: null }

  try {
    let rows = await kinguin.listKinguinProducts(filters)

    if (query.q) {
      const q = String(query.q).toLowerCase()
      rows = rows.filter(
        (r: any) => r.name?.toLowerCase().includes(q) || String(r.kinguin_id).includes(q)
      )
    }
    if (query.has_qty === "true") rows = rows.filter((r: any) => Number(r.qty) > 0)
    if (query.has_qty === "false") rows = rows.filter((r: any) => Number(r.qty) <= 0)

    const count = rows.length
    const offset = (page - 1) * limit
    const items = rows.slice(offset, offset + limit)

    res.json({
      products: items,
      count,
      page,
      limit,
      pending_approvals: rows.filter((r: any) => r.pending_price != null).length,
    })
  } catch (e: any) {
    res.status(500).json({ message: e?.message })
  }
}
