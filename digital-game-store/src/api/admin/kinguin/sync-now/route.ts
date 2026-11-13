import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { runKinguinSync, syncKinguinPrices } from "../../../../utils/kinguin-sync"

const BodySchema = z.object({
  type: z.enum(["full", "price"]).default("full"),
  max_pages: z.number().min(1).max(500).optional(),
})

// Admin "Şimdi senkronize et". Varsayilan tam senkron; type=price sadece fiyat.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Geçersiz gövde", errors: parsed.error.flatten() })
  }

  const auditLog = req.scope.resolve("auditLog") as any

  const summary =
    parsed.data.type === "price"
      ? await syncKinguinPrices(req.scope)
      : await runKinguinSync(req.scope, { force: true, maxPages: parsed.data.max_pages })

  await auditLog.log({
    action: "sync.trigger",
    entity: "kinguin",
    entity_id: null,
    diff: {
      type: parsed.data.type,
      ...(parsed.data.max_pages !== undefined && { max_pages: parsed.data.max_pages }),
    },
    actor_id: (req as any).auth_context?.actor_id ?? null,
    ip: req.headers?.["x-forwarded-for"] ?? null,
  })

  res.json(summary)
}
