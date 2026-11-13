import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import {
  computePriceForKinguinProduct,
  KinguinProductRow,
  updateVariantPrice,
} from "../../../../utils/kinguin-sync"
import { Modules } from "@medusajs/framework/utils"

// Onay bekleyen fiyat degisiklikleri (maliyet degisimi esigi asanlar)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const rows = await kinguin.listKinguinProducts({ pending_price: { $ne: null } })
  res.json({ approvals: rows, count: rows.length })
}

const ActionSchema = z.object({
  id: z.string(),
  action: z.enum(["approve", "reject"]),
})

// approve: bekleyen fiyati uygula; reject: bekleyeni temizle (bir sonraki senkrona kadar)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = ActionSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "Geçersiz gövde", errors: parsed.error.flatten() })
  }

  const kinguin = req.scope.resolve("kinguin") as any
  const productModule = req.scope.resolve("product") as any
  const logger = req.scope.resolve("logger") as any

  const rows = await kinguin.listKinguinProducts({ id: parsed.data.id })
  const kp = rows?.[0] as KinguinProductRow | undefined
  if (!kp || kp.pending_price == null) {
    return res.status(404).json({ message: "Onay kaydi bulunamadi" })
  }

  if (parsed.data.action === "approve") {
    if (kp.medusa_variant_id) {
      await updateVariantPrice(req.scope, kp.medusa_variant_id, Math.round(kp.pending_price))
    }
    await kinguin.updateKinguinProducts({
      id: kp.id,
      pending_price: null,
      pending_cost: null,
    } as any)
    logger.info(`[kinguin-price-approval] onaylandi: ${kp.name} -> ${kp.pending_price} USD minor`)
    res.json({ ok: true, action: "approved", priceMinor: kp.pending_price })
  } else {
    await kinguin.updateKinguinProducts({ id: kp.id, pending_price: null, pending_cost: null } as any)
    res.json({ ok: true, action: "rejected" })
  }
}
