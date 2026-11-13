import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

/**
 * POST /admin/order-control/:id/approve
 * Siparişi ve/veya ödemeyi manuel onaylar.
 *
 * Body:
 *   { target?: "payment" | "order", approved?: boolean }
 *   - target=payment (varsayılan): ödeme onayı
 *   - target=order: sipariş onayı (stok/fraud kontrolü)
 *
 * Key gönderimi için iki onayın da verilmiş olması gerekir (fulfill route).
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const auditLog = req.scope.resolve("auditLog") as any
    const { id } = req.params
    const body = (req.body || {}) as any
    const approved = body.approved !== false
    const target = body.target === "order" ? "order" : "payment"

    const order = await orderModule.retrieveOrder(id).catch(() => null)
    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" })
    }

    const now = new Date().toISOString()
    const actor =
      (req as any).auth_context?.actor_id ?? (req as any).auth_context?.actor_type ?? null

    const metadata =
      target === "order"
        ? {
            ...(order.metadata || {}),
            order_approved: approved,
            order_approved_at: approved ? now : null,
            order_approved_by: actor,
          }
        : {
            ...(order.metadata || {}),
            payment_approved: approved,
            payment_approved_at: approved ? now : null,
            payment_approved_by: actor,
          }

    await orderModule.updateOrders([{ id, metadata }])

    await auditLog.log({
      action:
        target === "order"
          ? approved
            ? "order.approve"
            : "order.unapprove"
          : approved
            ? "order.payment_approve"
            : "order.payment_unapprove",
      entity: "order",
      entity_id: id,
      diff: {
        payment_status: order.payment_status,
        target,
        approved,
      },
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })

    res.json({
      ok: true,
      target,
      approved,
      payment_approved: metadata.payment_approved === true,
      order_approved: metadata.order_approved === true,
      message:
        target === "order"
          ? approved
            ? "Sipariş onaylandı"
            : "Sipariş onayı geri alındı"
          : approved
            ? "Ödeme onaylandı"
            : "Ödeme onayı geri alındı",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Onay işlemi başarısız", error: error?.message })
  }
}
