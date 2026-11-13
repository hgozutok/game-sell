import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { fulfillKinguinOrderWorkflow } from "../../../../../workflows/fulfill-kinguin-order"

const BodySchema = z.object({ order_id: z.string().min(1) })

// Kuyruktaki siparisi onayla -> fulfillment workflow'u tetiklenir.
// readonly modda once order mode 'live'a alinmali (guvenlik zinciri).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "order_id gerekli", errors: parsed.error.flatten() })
  }

  const kinguin = req.scope.resolve("kinguin") as any
  const orderModule = req.scope.resolve(Modules.ORDER) as any
  const logger = req.scope.resolve("logger") as any
  const auditLog = req.scope.resolve("auditLog") as any

  const settings = await kinguin.getSettings()
  if (settings.order_mode !== "live") {
    return res.status(409).json({
      message:
        "Kinguin order mode 'readonly'. Canliya gecmeden onay islem yapamaz — önce ayarlardan order_mode=live yapin.",
    })
  }

  const order = await orderModule.retrieveOrder(parsed.data.order_id, { relations: ["items"] })
  if (!order) return res.status(404).json({ message: "Siparis bulunamadi" })

  await orderModule.updateOrder(parsed.data.order_id, {
    metadata: {
      ...(order.metadata || {}),
      fulfillment_state: "pending_fulfillment",
      fulfillment_approved_by: (req as any).auth_context?.actor_id || "admin",
      fulfillment_approved_at: new Date().toISOString(),
      fulfillment_error: null,
    },
  })

  try {
    await fulfillKinguinOrderWorkflow(req.scope).run({
      input: {
        orderId: parsed.data.order_id,
        customerId: order.customer_id,
        email: order.email,
        approvedBy: (req as any).auth_context?.actor_id || "admin",
      },
    })
    await auditLog.log({
      action: "fulfillment.approve",
      entity: "order",
      entity_id: parsed.data.order_id,
      diff: {
        order_id: parsed.data.order_id,
        decision: "approved",
        approved_by: (req as any).auth_context?.actor_id || "admin",
      },
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })
    res.json({ ok: true })
  } catch (e: any) {
    logger.warn(`[fulfillment-queue] onay sonrasi hata: ${e?.message}`)
    res.status(500).json({ ok: false, message: String(e?.message || e) })
  }
}
