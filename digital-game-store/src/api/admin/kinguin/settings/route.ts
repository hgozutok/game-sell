import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const UpdateSchema = z.object({
  auto_fulfill_enabled: z.boolean().optional(),
  order_mode: z.enum(["readonly", "live"]).optional(),
  min_balance: z.number().min(0).max(10000).optional(),
  stop_on_negative_margin: z.boolean().optional(),
  sync_cron: z.string().max(50).optional(),
  sync_interval_minutes: z.number().min(15).max(10080).optional(),
  sync_prices: z.boolean().optional(),
  sync_stock: z.boolean().optional(),
  sync_info: z.boolean().optional(),
  sync_new_products: z.boolean().optional(),
  // 0 = sinirsiz
  sync_new_products_limit: z.number().min(0).max(200000).optional(),
  hide_on_zero_stock: z.boolean().optional(),
  auto_reprice: z.boolean().optional(),
  max_price_change_pct: z.number().min(1).max(500).optional(),
  default_margin_pct: z.number().min(-50).max(500).optional(),
  min_profit_pct: z.number().min(0).max(500).optional(),
  rounding_rule: z.enum(["none", "ninety_nine"]).optional(),
  provider_currency: z.string().length(3).optional(),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  res.json(await kinguin.getSettings())
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "Geçersiz ayar", errors: parsed.error.flatten() })
  }
  const kinguin = req.scope.resolve("kinguin") as any
  const logger = req.scope.resolve("logger") as any
  const auditLog = req.scope.resolve("auditLog") as any

  const previous = await kinguin.getSettings().catch(() => null)

  // readonly -> live gecisi monitoring icin loglanir
  if (parsed.data.order_mode === "live") {
    logger.warn("[kinguin-settings] ORDER MODE LIVE'a alindi — Kinguin siparisleri para harcayacak!")
  }
  const updated = await kinguin.updateSettings(parsed.data as any)

  // Audit: onceki degerler ile degisiklik ozeti
  const diff: Record<string, { from: any; to: any }> = {}
  for (const [key, to] of Object.entries(parsed.data)) {
    const from = previous ? (previous as any)[key] : undefined
    if (from !== to) diff[key] = { from, to }
  }
  await auditLog.log({
    action: "settings.update",
    entity: "kinguin_settings",
    entity_id: "settings_default",
    diff: Object.keys(diff).length ? diff : { note: "no change" },
    actor_id: (req as any).auth_context?.actor_id ?? null,
    ip: req.headers?.["x-forwarded-for"] ?? null,
  })

  res.json(updated)
}
