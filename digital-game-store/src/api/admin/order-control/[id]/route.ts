import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /admin/order-control/:id
 * Sipariş + müşteri + ödeme detayı (admin sipariş ekranı için).
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
    const { id } = req.params

    let order: any = null

    try {
      const { data } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "display_id",
          "status",
          "payment_status",
          "fulfillment_status",
          "email",
          "currency_code",
          "subtotal",
          "tax_total",
          "shipping_total",
          "total",
          "created_at",
          "metadata",
          "customer_id",
          "customer.id",
          "customer.email",
          "customer.first_name",
          "customer.last_name",
          "customer.phone",
          "shipping_address.*",
          "items.id",
          "items.title",
          "items.quantity",
          "items.unit_price",
          "items.total",
          "items.product_id",
          "items.variant_id",
        ],
        filters: { id },
      })
      if (data && data[0]) {
        order = data[0]
      }
    } catch {}

    if (!order) {
      order = await orderModule
        .retrieveOrder(id, { relations: ["items"] })
        .catch(() => null)
    }

    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" })
    }

    // Customer hydration if needed
    if (order.customer_id && !order.customer) {
      try {
        const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
        order.customer = await customerModule
          .retrieveCustomer(order.customer_id)
          .catch(() => null)
      } catch {}
    }

    // Ödeme oturumları ve ödemeler (varsa) — provider + durum bilgisi
    let paymentSessions: any[] = []
    let payments: any[] = []
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
          "payments.id",
          "payments.amount",
          "payments.currency_code",
          "payments.provider_id",
          "payments.captured_at",
          "payments.refunds.*",
        ],
        filters: { order_id: id } as any,
      })
      paymentSessions = (data || []).flatMap((c: any) => c.payment_sessions || [])
      payments = (data || []).flatMap((c: any) => c.payments || [])
    } catch {
      paymentSessions = []
      payments = []
    }

    const metadata = order.metadata || {}
    const paidStatuses = ["captured", "partially_captured"]
    const paymentApproved =
      metadata.payment_approved === true ||
      paidStatuses.includes(String(order.payment_status)) ||
      payments.some((p: any) => Boolean(p.captured_at) || p.status === "captured")
    const orderApproved = metadata.order_approved === true

    const keyInventory = req.scope.resolve("keyInventory") as any
    const digitalKeys = await keyInventory.getKeysByOrder(id).catch(() => [])

    const customer = order.customer || {}
    const shipping = order.shipping_address || {}

    const email =
      order.email ||
      customer.email ||
      shipping.email ||
      metadata.email ||
      metadata.customer_email ||
      null

    const customerName =
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      [shipping.first_name, shipping.last_name].filter(Boolean).join(" ") ||
      metadata.customer_name ||
      null

    const createdAt =
      order.created_at || order.createdAt || metadata.created_at || null

    const displayId = order.display_id ?? metadata.display_id ?? null

    const total =
      order.total ??
      (order.items || []).reduce(
        (sum: number, item: any) =>
          sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
        0
      )

    res.json({
      order: {
        id: order.id,
        display_id: displayId,
        status: order.status,
        payment_status: order.payment_status || (paymentApproved ? "captured" : "awaiting"),
        fulfillment_status: order.fulfillment_status,
        email: email,
        customer_name: customerName,
        customer_email: customer.email || email,
        customer_id: order.customer_id,
        currency_code: order.currency_code || "usd",
        subtotal: order.subtotal ?? total,
        tax_total: order.tax_total ?? 0,
        shipping_total: order.shipping_total ?? 0,
        total: total,
        created_at: createdAt,
        metadata,
        payment_method: metadata.payment_method || null,
        payment_provider: metadata.payment_provider || null,
        payment_approved: paymentApproved,
        payment_approved_at: metadata.payment_approved_at || null,
        order_approved: orderApproved,
        order_approved_at: metadata.order_approved_at || null,
        digital_fulfilled: metadata.digital_fulfilled === true,
        fulfillment_state: metadata.fulfillment_state || null,
        canceled_at: order.canceled_at || metadata.canceled_at || null,
        cancellation_reason: metadata.cancellation_reason || null,
        refunded: metadata.refunded === true || order.payment_status === "refunded",
        refunded_at: metadata.refunded_at || null,
        refund_amount: metadata.refund_amount || null,
        refund_reason: metadata.refund_reason || null,
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
          total: item.total ?? (Number(item.unit_price || 0) * Number(item.quantity || 0)),
          product_id: item.product_id,
          variant_id: item.variant_id,
        })),
      },
      payment_sessions: paymentSessions,
      payments: payments,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Sipariş detayı alınamadı", error: error?.message })
  }
}
