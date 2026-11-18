import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"


/**
 * GET /admin/order-control/:id
 * Sipariş + ödeme detayı (admin sipariş ekranı için).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { id } = req.params

    const order = await orderModule
      .retrieveOrder(id, { relations: ["items"] })
      .catch(() => null)

    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" })
    }

    // Ödeme oturumları (varsa) — provider + durum bilgisi
    let paymentSessions: any[] = []
    try {
      const { data } = await query.graph({
        entity: "payment_collection",
        fields: [
          "id",
          "status",
          "amount",
          "currency_code",
          "payment_sessions.id",
          "payment_sessions.provider_id",
          "payment_sessions.status",
          "payment_sessions.amount",
        ],
        filters: { order_id: id } as any,
      })
      paymentSessions = (data || []).flatMap((c: any) => c.payment_sessions || [])
    } catch {
      paymentSessions = []
    }

    const metadata = order.metadata || {}
    const paidStatuses = ["captured", "partially_captured"]
    const paymentApproved =
      metadata.payment_approved === true || paidStatuses.includes(String(order.payment_status))
    const orderApproved = metadata.order_approved === true

    const keyInventory = req.scope.resolve("keyInventory") as any
    const digitalKeys = await keyInventory.getKeysByOrder(id).catch(() => [])

    res.json({
      order: {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        payment_status: order.payment_status,
        fulfillment_status: order.fulfillment_status,
        email: order.email,
        customer_id: order.customer_id,
        currency_code: order.currency_code,
        subtotal: order.subtotal,
        tax_total: order.tax_total,
        shipping_total: order.shipping_total,
        total: order.total,
        created_at: order.created_at,
        metadata,
        payment_method: metadata.payment_method || null,
        payment_provider: metadata.payment_provider || null,
        payment_approved: paymentApproved,
        payment_approved_at: metadata.payment_approved_at || null,
        order_approved: orderApproved,
        order_approved_at: metadata.order_approved_at || null,
        digital_fulfilled: metadata.digital_fulfilled === true,
        fulfillment_state: metadata.fulfillment_state || null,
        digital_keys: (digitalKeys || []).map((key: any) => ({
          id: key.id,
          key_code: key.key_code,
          provider: key.provider,
          status: key.status,
          platform: key.platform,
          region: key.region,
          assigned_at: key.assigned_at,
          delivered_at: key.delivered_at,
        })),
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          product_id: item.product_id,
          variant_id: item.variant_id,
        })),
      },
      payment_sessions: paymentSessions,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Sipariş detayı alınamadı", error: error?.message })
  }
}
