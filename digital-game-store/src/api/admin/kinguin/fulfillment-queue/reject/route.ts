import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"

const BodySchema = z.object({
  order_id: z.string().min(1),
  reason: z.string().max(300).optional(),
})

// Kuyruktaki siparisi reddet -> siparis iptal edilir (iade akisi odeme modulune dusar).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "order_id gerekli", errors: parsed.error.flatten() })
  }

  const orderModule = req.scope.resolve(Modules.ORDER) as any
  const logger = req.scope.resolve("logger") as any
  const auditLog = req.scope.resolve("auditLog") as any

  const order = await orderModule.retrieveOrder(parsed.data.order_id).catch(() => null)
  if (!order) return res.status(404).json({ message: "Siparis bulunamadi" })

  try {
    await orderModule.cancelOrder(parsed.data.order_id)
    await orderModule.updateOrder(parsed.data.order_id, {
      metadata: {
        ...(order.metadata || {}),
        fulfillment_state: "rejected",
        fulfillment_error: parsed.data.reason || "admin reddi",
      },
    })
    await auditLog.log({
      action: "fulfillment.reject",
      entity: "order",
      entity_id: parsed.data.order_id,
      diff: {
        order_id: parsed.data.order_id,
        decision: "rejected",
        ...(parsed.data.reason && { reason: parsed.data.reason }),
      },
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })
    res.json({ ok: true })
  } catch (e: any) {
    logger.warn(`[fulfillment-queue] red hatasi: ${e?.message}`)
    res.status(500).json({ ok: false, message: String(e?.message || e) })
  }
}
