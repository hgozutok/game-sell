import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { computePriceForKinguinProduct } from "../../../../utils/kinguin-sync"

const BodySchema = z.object({
  kinguin_id: z.string().optional(),
  // kinguin_id verilmemisse elle maliyet girilir:
  cost_minor: z.number().min(0).optional(), // provider currency minor
  platform: z.string().optional(),
  genre: z.string().optional(),
  margin_override_pct: z.number().optional(),
  override_price: z.number().min(0).optional(),
})

// Fiyat onizleme: marj kurali + kur + yuvarlama kirilimi
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "Geçersiz gövde", errors: parsed.error.flatten() })
  }

  const kinguin = req.scope.resolve("kinguin") as any
  let kp: any = null

  if (parsed.data.kinguin_id) {
    const rows = await kinguin.listKinguinProducts({ kinguin_id: parsed.data.kinguin_id })
    kp = rows?.[0]
    if (!kp) return res.status(404).json({ message: "Katalog kaydi bulunamadi" })
  } else if (parsed.data.cost_minor === undefined) {
    return res.status(400).json({ message: "kinguin_id veya cost_minor gerekli" })
  } else {
    kp = {
      id: "preview",
      price: parsed.data.cost_minor,
      currency: "eur",
      platform: parsed.data.platform ?? null,
      genre: parsed.data.genre ?? null,
    }
  }

  const settings = await kinguin.getSettings()
  const computed = await computePriceForKinguinProduct(req.scope, kp, settings, {
    marginOverridePct: parsed.data.margin_override_pct,
    overridePriceMinor: parsed.data.override_price,
  })

  res.json({
    input: {
      kinguin_id: parsed.data.kinguin_id ?? null,
      cost_minor: Number(kp.price),
      platform: kp.platform,
      genre: kp.genre,
    },
    settings: {
      rounding_rule: settings.rounding_rule,
      min_profit_pct: settings.min_profit_pct,
      max_price_change_pct: settings.max_price_change_pct,
    },
    result: computed,
  })
}
