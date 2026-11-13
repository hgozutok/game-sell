import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncOneKinguinOrder, maybeDeliverLinkedOrder } from "../../../utils/kinguin-order-sync"

/**
 * POST /webhooks/kinguin
 * Kinguin ESA webhook'lari: X-Event-Name + X-Event-Secret header'larla gelir.
 * Eventler: order.status, product.update
 *
 * Guvenlik: secret timing-safe karsilastirma; hatali imza 401.
 * 2xx donulmesi gerekiyor (Kinguin yeniden denemesin).
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const eventName = (req.headers["x-event-name"] as string) || ""
  const eventSecret = req.headers["x-event-secret"] as string | undefined

  const kinguin = req.scope.resolve("kinguin") as any
  const logger = req.scope.resolve("logger") as any

  if (!kinguin.verifyWebhookSecret(eventSecret)) {
    logger.warn("[kinguin-webhook] gecersiz imza reddedildi")
    return res.status(401).json({ message: "Invalid webhook secret" })
  }

  const payload = (req.body || {}) as any

  try {
    switch (eventName) {
      case "order.status": {
        const orderId = payload.orderId || payload.order_id || payload.id
        if (!orderId) return res.status(400).json({ message: "orderId required" })

        // kinguin_order kaydini bul (order_id ile); yoksa yok say (bize ait olmayabilir)
        const rows = await kinguin.listKinguinOrders({ order_id: String(orderId) })
        if (rows.length === 0) {
          return res.status(204).json({})
        }
        const result = await syncOneKinguinOrder(req.scope, rows[0])

        if (result.status === "completed" && rows[0].medusa_order_id) {
          await maybeDeliverLinkedOrder(req.scope, rows[0].medusa_order_id)
        }
        logger.info(`[kinguin-webhook] order.status ${orderId} -> ${result.status}`)
        return res.status(204).json({})
      }

      case "product.update": {
        const kinguinId = payload.kinguinId || payload.kinguin_id
        if (kinguinId) {
          try {
            const data = await kinguin.getProduct(String(kinguinId))
            await kinguin.upsertLocalProduct(data)
            // listeleniyorsa fiyat/stok senkronu: sirf bu urun icin
            const local = await kinguin.listKinguinProducts({ kinguin_id: String(kinguinId) })
            const kp = local?.[0]
            if (kp?.store_listed) {
              const { syncKinguinPrices } = await import("../../../utils/kinguin-sync.js")
              await syncKinguinPrices(req.scope)
            }
          } catch (e: any) {
            logger.warn(`[kinguin-webhook] product.update hatasi: ${e?.message}`)
          }
        }
        return res.status(204).json({})
      }

      default:
        logger.info(`[kinguin-webhook] bilinmeyen event: ${eventName}`)
        return res.status(204).json({})
    }
  } catch (e: any) {
    logger.error(`[kinguin-webhook] hata: ${e?.message}`)
    return res.status(200).json({ message: "processed with error" })
  }
}
