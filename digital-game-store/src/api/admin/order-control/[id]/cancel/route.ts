import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/core-flows"

/**
 * POST /admin/order-control/:id/cancel
 * Body: { reason?: string, note?: string }
 * Cancels the order, updates metadata/status, and revokes reserved digital keys.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const logger = req.scope.resolve("logger") as any
  const orderModule = req.scope.resolve(Modules.ORDER) as any

  try {
    const order = await orderModule.retrieveOrder(id).catch(() => null)
    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" })
    }

    if (order.status === "canceled") {
      return res.status(400).json({ message: "Sipariş zaten iptal edilmiş." })
    }

    const { reason, note } = (req.body as any) || {}

    // 1) Medusa standard cancelOrderWorkflow denemesi
    let workflowSuccess = false
    try {
      await cancelOrderWorkflow(req.scope).run({
        input: {
          order_id: id,
          canceled_by: (req as any).auth_context?.actor_id || "admin",
        },
      })
      workflowSuccess = true
    } catch (err: any) {
      logger.warn(
        `cancelOrderWorkflow warning for order ${id}: ${err.message}. Direct status update fallback applying.`
      )
    }

    // 2) Sipariş durumunu ve metadata'yı güncelle
    const updatedMetadata = {
      ...(order.metadata || {}),
      canceled_at: new Date().toISOString(),
      fulfillment_state: "canceled",
      cancellation_reason: reason || "Yönetici tarafından iptal edildi",
      cancellation_note: note || null,
    }

    await orderModule.updateOrders([
      {
        id,
        status: "canceled",
        metadata: updatedMetadata,
      },
    ])

    // 3) Siparişe atanmış henüz tamamlanmamış anahtarları iptal et/serbest bırak
    try {
      const keyInventory = req.scope.resolve("keyInventory") as any
      const keys = await keyInventory.getKeysByOrder(id).catch(() => [])
      for (const k of keys || []) {
        if (k.status !== "revoked") {
          await keyInventory.revokeKey(k.id).catch(() => null)
        }
      }
    } catch (kErr: any) {
      logger.warn(`Could not revoke keys for canceled order ${id}: ${kErr.message}`)
    }

    logger.info(`✅ Order ${id} has been canceled by admin`)

    res.json({
      success: true,
      message: "Sipariş başarıyla iptal edildi.",
      order_id: id,
      status: "canceled",
      workflow_success: workflowSuccess,
    })
  } catch (error: any) {
    logger.error(`Error canceling order ${id}: ${error.message}`)
    res.status(500).json({ message: "Sipariş iptal edilemedi", error: error?.message })
  }
}
