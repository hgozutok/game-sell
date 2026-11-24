import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/core-flows"
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
    let alreadyCanceled = false
    // Medusa v2.11 Order modulunde cancelOrder metodu YOK — iptal core-flows
    // workflow'u ile yapilir (kuyruktaki siparisler 'pending' oldugundan
    // cancelable'dir; captured odeme yoksa iade adimi da sorun cikarmaz).
    try {
      await cancelOrderWorkflow(req.scope).run({
        input: { order_id: parsed.data.order_id },
      })
    } catch (cancelErr: any) {
      // "has been canceled" = zaten iptal edilmis (orn. toplu temizlikte) —
      // idempotent davran: metadata'yi 'rejected' yap, 200 don.
      if (/has been canceled/i.test(String(cancelErr?.message || ""))) {
        alreadyCanceled = true
      } else {
        throw cancelErr
      }
    }
    try {
      await orderModule.updateOrder(parsed.data.order_id, {
        metadata: {
          ...(order.metadata || {}),
          fulfillment_state: "rejected",
          fulfillment_error: parsed.data.reason || (alreadyCanceled ? "siparis zaten iptal edilmisti" : "admin reddi"),
        },
      })
    } catch (metaErr: any) {
      // Iptal edilmis sipariste metadata update kisiyorsa sessiz gec —
      // asil islem (iptal) tamamlanmis durumda.
      logger?.warn?.(
        `[fulfillment-queue] metadata guncellenemedi (zaten iptal): ${metaErr?.message}`
      )
    }
    if (alreadyCanceled) {
      logger.warn(
        `[fulfillment-queue] ${parsed.data.order_id}: zaten iptal edilmisti — kuyruk kaydi temizlendi`
      )
    }
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
