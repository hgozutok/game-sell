import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { fulfillDigitalOrderWorkflow } from "../../../../../workflows/fulfill-digital-order"
import { fulfillKinguinOrderWorkflow } from "../../../../../workflows/fulfill-kinguin-order"


/**
 * POST /admin/order-control/:id/approve
 * Siparişi ve/veya ödemeyi manuel onaylar.
 *
 * Body:
 *   { target?: "payment" | "order", approved?: boolean }
 *   - target=payment (varsayılan): ödeme onayı
 *   - target=order: sipariş onayı (stok/fraud kontrolü)
 *
 * Onay sonrası iki onay da tamamlanmışsa (payment + order) ve keyler henuz
 * gonderilmemisse fulfillment otomatik tetiklenir — ayrica "fulfill" tikina
 * basmaya gerek kalmaz.
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

    // --- Otomatik fulfillment: iki onay da tamamlandiysa keyleri gonder ---
    const paidStatuses = ["captured", "partially_captured"]
    const paymentApproved =
      metadata.payment_approved === true ||
      paidStatuses.includes(String(order.payment_status))
    const orderApproved = metadata.order_approved === true
    const alreadyFulfilled = (order.metadata || {}).digital_fulfilled === true

    let autoFulfilled = false
    let autoFulfillError: string | null = null

    if (approved && paymentApproved && orderApproved && !alreadyFulfilled) {
      try {
        const orderWithItems = await orderModule
          .retrieveOrder(id, { relations: ["items"] })
          .catch(() => null)
        const items: any[] = orderWithItems?.items || []
        if (items.length === 0) {
          autoFulfillError = "Siparişte ürün bulunmuyor"
        } else {
          const productModule = req.scope.resolve(Modules.PRODUCT) as any
          const productIds = Array.from(
            new Set(items.map((i: any) => i.product_id).filter(Boolean))
          )
          const products = productIds.length
            ? await productModule.listProducts({ id: productIds }).catch(() => [])
            : []
          const productsById = new Map((products || []).map((p: any) => [p.id, p]))
          const flagged = items.filter((item: any) => {
            const product: any = productsById.get(item.product_id)
            return product?.metadata?.is_digital === true
          })
          // Mağaza tamamen dijital; işaret yoksa tüm kalemler dijital kabul edilir
          const digitalItems = flagged.length > 0 ? flagged : items

          // Stokta yeterli available key varsa direkt anahtar gonder; yoksa
          // Kinguin'den satin alip teslim eden workflow'u calistir.
          const keyInventory = req.scope.resolve("keyInventory") as any
          const totalQty = digitalItems.reduce(
            (sum: number, item: any) => sum + Number(item.quantity || 1),
            0
          )
          let availableKeys = 0
          try {
            const counts = await Promise.all(
              digitalItems.map((item: any) =>
                keyInventory
                  .getInventoryCount(item.product_id, item.variant_id)
                  .catch(() => 0)
              )
            )
            availableKeys = counts.reduce((s: number, c: number) => s + c, 0)
          } catch {
            availableKeys = 0
          }

          if (availableKeys >= totalQty) {
            const run = await fulfillDigitalOrderWorkflow(req.scope).run({
              input: {
                orderId: id,
                customerId: order.customer_id,
                email: order.email,
                items: digitalItems.map((item: any) => ({
                  productId: item.product_id,
                  variantId: item.variant_id,
                  quantity: item.quantity,
                  lineItemId: item.id,
                })),
              },
            })
            // Gercek teslimati dogrula: siparise atanmis key sayisi
            const assigned = await keyInventory
              .listDigitalKeys({ order_id: id })
              .catch(() => [])
            if (!Array.isArray(assigned) || assigned.length < totalQty) {
              throw new Error(
                `Key atanamadi: ${assigned?.length || 0}/${totalQty} — envanter/provider kontrol et`
              )
            }
          } else {
            const run = await fulfillKinguinOrderWorkflow(req.scope).run({
              input: {
                orderId: id,
                customerId: order.customer_id,
                email: order.email,
                approvedBy: actor || "admin",
              },
            })
            const result: any = (run as any)?.result ?? run
            const keysDelivered = Array.isArray(result?.deliveredKeys)
              ? result.deliveredKeys.length
              : 0
            const hasPending = result?.hasPending === true
            // hasPending=true: keyler async olarak Kinguin'den cekilecek (kabul)
            // ikisi de yoksa workflow "bos basari" dönmüs demektir — kayit
            // eslesen satirlar yok / provider map bozuk. False positive olmasin.
            if (!hasPending && keysDelivered === 0) {
              throw new Error(
                "Kinguin siparisi olusturulamadi: satirlar provider ile eslesmedi (providerProductId yok) veya key uretilemedi"
              )
            }
          }

          await orderModule.updateOrders([
            {
              id,
              metadata: {
                ...metadata,
                digital_fulfilled: true,
                fulfillment_state: "fulfilled",
                fulfillment_error: null,
                fulfillment_updated_at: now,
              },
            },
          ])

          await auditLog.log({
            action: "order.fulfill",
            entity: "order",
            entity_id: id,
            diff: {
              order_id: id,
              trigger: "approve_auto",
              path: availableKeys >= totalQty ? "inventory_keys" : "kinguin_purchase",
            },
            actor_id: (req as any).auth_context?.actor_id ?? null,
            ip: req.headers?.["x-forwarded-for"] ?? null,
          })

          autoFulfilled = true
        }
      } catch (fulfillError: any) {
        autoFulfillError = String(fulfillError?.message || fulfillError)
        // readonly/zarar/bakiye gibi queue guard'lari failed degil, kuyrukta kalmali
        const code = fulfillError?.code || fulfillError?.details?.code
        const queueGuard =
          code === "READONLY" || code === "NEGATIVE_MARGIN" || code === "BALANCE" ||
          code === "ORDER_LIMIT" ||
          fulfillError?.name === "KinguinOrderModeError" ||
          fulfillError?.name === "KinguinInsufficientBalanceError"
        await orderModule
          .updateOrders([
            {
              id,
              metadata: {
                ...metadata,
                fulfillment_state: queueGuard ? "awaiting_approval" : "failed",
                fulfillment_error: autoFulfillError,
                fulfillment_updated_at: new Date().toISOString(),
              },
            },
          ])
          .catch(() => null)
      }
    }

    res.json({
      ok: true,
      target,
      approved,
      payment_approved: metadata.payment_approved === true,
      order_approved: metadata.order_approved === true,
      auto_fulfilled: autoFulfilled,
      auto_fulfill_error: autoFulfillError,
      message: autoFulfilled
        ? "Onay tamamlandı — keyler otomatik gönderildi"
        : approved
          ? target === "order"
            ? "Sipariş onaylandı"
            : "Ödeme onaylandı"
          : target === "order"
            ? "Sipariş onayı geri alındı"
            : "Ödeme onayı geri alındı",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Onay işlemi başarısız", error: error?.message })
  }
}
