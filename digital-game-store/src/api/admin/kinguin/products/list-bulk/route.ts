import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listKinguinProduct, KinguinProductRow } from "../../../../../utils/kinguin-sync"

/**
 * POST /admin/kinguin/products/list-bulk
 * Body: { limit?: number }
 *
 * Katalogdaki uygun (stoklu, fiyati gecerli, preorder olmayan) urunlerden
 * en fazla `limit` tanesini magazada listeler. Negatif marjli urunler
 * stop_on_negative_margin ayariyla engellenir.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const body = (req.body || {}) as any
  const limit = Math.min(100, Math.max(1, Number(body.limit) || 20))
  const dryRun = body.dry_run === true

  const candidates = await kinguin.listKinguinProducts(
    {
      store_listed: false,
      is_preorder: false,
      qty: { $gt: 0 },
      price: { $gt: 0 },
    },
    { take: limit, order: { updated_at: "DESC" } }
  )

  if (dryRun) {
    return res.json({
      dry_run: true,
      requested: limit,
      candidates: candidates.length,
      products: (candidates as KinguinProductRow[]).map((kp) => ({
        id: kp.id,
        kinguin_id: kp.kinguin_id,
        name: kp.name,
        price: kp.price,
        currency: kp.currency,
        qty: kp.qty,
      })),
    })
  }

  const results: Array<Record<string, any>> = []
  let listed = 0
  let blockedNegative = 0
  let failed = 0

  for (const kp of candidates as KinguinProductRow[]) {
    const r = await listKinguinProduct(req.scope, kp, {})
    if (r.ok) listed++
    else if (r.negative) blockedNegative++
    else failed++
    results.push({
      id: kp.id,
      kinguin_id: kp.kinguin_id,
      name: kp.name,
      ...r,
    })
  }

  res.json({
    requested: limit,
    candidates: candidates.length,
    listed,
    blocked_negative_margin: blockedNegative,
    failed,
    results,
  })
}
