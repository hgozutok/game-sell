import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { refundPaymentWorkflow } from "@medusajs/core-flows"
import { getOrderPayments } from "../../../../../utils/payment-verification"

/**
 * POST /admin/order-control/:id/refund
 * Body: { amount?: number, reason?: string, note?: string }
 * Issues payment refund if gateway supports it, marks order refunded, and revokes keys.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const logger = req.scope.resolve("logger") as any
  const orderModule = req.scope.resolve(Modules.ORDER) as any

  try {
    const order = await orderModule
      .retrieveOrder(id, { relations: ["items"] })
      .catch(() => null)
    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" })
    }

    const { amount, reason, note } = (req.body as any) || {}
    const refundAmount =
      amount !== undefined && amount !== null && Number(amount) > 0
        ? Number(amount)
        : Number(order.total || 0)

    // 1) Siparişin tahsil edilmiş ödemelerini bul
    let payments: any[] = []
    try {
      payments = await getOrderPayments(req.scope, id)
    } catch {}

    const capturedPayment = payments.find(
      (p: any) =>
        Boolean(p.captured_at) ||
        Number(p.captured_amount || 0) > 0 ||
        p.status === "captured"
    )

    let paymentRefunded = false
    let refundError: string | null = null

    if (capturedPayment) {
      try {
        await refundPaymentWorkflow(req.scope).run({
          input: {
            payment_id: capturedPayment.id,
            amount: refundAmount || capturedPayment.amount,
            created_by: (req as any).auth_context?.actor_id || "admin",
            note: note || reason || "Admin para iadesi",
          },
        })
        paymentRefunded = true
      } catch (pErr: any) {
        refundError = pErr.message
        logger.warn(
          `refundPaymentWorkflow notice for order ${id}: ${pErr.message}. Updating order status directly.`
        )
      }
    }

    // 2) Sipariş durumunu ve metadata'yı güncelle
    const updatedMetadata = {
      ...(order.metadata || {}),
      refunded: true,
      refunded_at: new Date().toISOString(),
      refund_amount: refundAmount,
      refund_reason: reason || "Yönetici tarafından iade edildi",
      refund_note: note || null,
      payment_status: "refunded",
    }

    await orderModule.updateOrders([
      {
        id,
        payment_status: "refunded",
        metadata: updatedMetadata,
      },
    ])

    // 3) Anahtarları iptal et
    try {
      const keyInventory = req.scope.resolve("keyInventory") as any
      const keys = await keyInventory.getKeysByOrder(id).catch(() => [])
      for (const k of keys || []) {
        if (k.status !== "revoked") {
          await keyInventory.revokeKey(k.id).catch(() => null)
        }
      }
    } catch (kErr: any) {
      logger.warn(`Could not revoke keys for refunded order ${id}: ${kErr.message}`)
    }

    logger.info(`✅ Order ${id} refund processed. Amount: ${refundAmount}`)

    res.json({
      success: true,
      message: paymentRefunded
        ? "Ödeme sağlayıcısından ve siparişten para iadesi başarıyla yapıldı."
        : "Para iadesi kaydedildi ve sipariş durumu güncellendi.",
      order_id: id,
      refund_amount: refundAmount,
      payment_refunded: paymentRefunded,
      warning: refundError,
    })
  } catch (error: any) {
    logger.error(`Error refunding order ${id}: ${error.message}`)
    res.status(500).json({ message: "Para iadesi yapılamadı", error: error?.message })
  }
}
