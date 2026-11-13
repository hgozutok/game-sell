import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { listKinguinProduct, KinguinProductRow } from "../../../../../utils/kinguin-sync"

const BodySchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  margin_override_pct: z.number().min(-50).max(500).optional(),
  override_price: z.number().min(0).optional(), // usd minor
})

// Secili Kinguin urunlerini magazada listeler (fiyat motoruyla).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "Geçersiz gövde", errors: parsed.error.flatten() })
  }
  const { ids, margin_override_pct, override_price } = parsed.data
  const kinguin = req.scope.resolve("kinguin") as any

  const results: Array<Record<string, any>> = []
  for (const id of ids) {
    const rows = await kinguin.listKinguinProducts({ id })
    const kp = rows?.[0]
    if (!kp) {
      results.push({ id, ok: false, error: "not found" })
      continue
    }
    const r = await listKinguinProduct(req.scope, kp as KinguinProductRow, {
      marginOverridePct: margin_override_pct,
      overridePriceMinor: override_price,
    })
    results.push({ id, kinguinId: kp.kinguin_id, name: kp.name, ...r })
  }

  const ok = results.filter((r) => r.ok).length
  const negative = results.filter((r) => r.negative).length
  res.json({
    total: results.length,
    listed: ok,
    blocked_negative_margin: negative,
    results,
  })
}
