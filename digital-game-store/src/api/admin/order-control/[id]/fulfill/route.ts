import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { fulfillDigitalOrderWorkflow } from '../../../../../workflows/fulfill-digital-order'


/**
 * POST /admin/order-control/:id/fulfill
 * Dijital teslimatı tetikler.
 *
 * GÜVENLİK: Ödeme ve sipariş onayı tamamlanmadan (metadata.payment_approved /
 * metadata.order_approved veya captured) key gönderimi yapılmaz — 409 döner.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const { id: orderId } = req.params

    const order = await orderModule.retrieveOrder(orderId, { relations: ['items'] }).catch(() => null)
    if (!order) {
      return res.status(404).json({ message: 'Sipariş bulunamadı' })
    }

    const metadata = order.metadata || {}
    const paidStatuses = ['captured', 'partially_captured']
    const paymentApproved =
      metadata.payment_approved === true || paidStatuses.includes(String(order.payment_status))
    const orderApproved = metadata.order_approved === true

    const missing: string[] = []
    if (!paymentApproved) missing.push('ödeme onayı')
    if (!orderApproved) missing.push('sipariş onayı')

    if (missing.length > 0) {
      return res.status(409).json({
        message: `Key gönderilemez: ${missing.join(' ve ')} bekleniyor.`,
        payment_status: order.payment_status,
        payment_approved: paymentApproved,
        order_approved: orderApproved,
      })
    }

    if (metadata.digital_fulfilled === true) {
      return res.status(409).json({ message: 'Bu sipariş için keyler zaten gönderildi' })
    }

    const items: any[] = order.items || []
    if (items.length === 0) {
      return res.status(400).json({ message: 'Siparişte ürün bulunmuyor' })
    }

    // Ürün metadata'sını ayri sorgu ile al (order relation'lari bu sürümde hata veriyor)
    const productIds = Array.from(new Set(items.map((i: any) => i.product_id).filter(Boolean)))
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

    await fulfillDigitalOrderWorkflow(req.scope).run({
      input: {
        orderId: order.id,
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

    await orderModule.updateOrders([
      {
        id: order.id,
        metadata: {
          ...metadata,
          digital_fulfilled: true,
          fulfillment_state: 'fulfilled',
          fulfillment_updated_at: new Date().toISOString(),
        },
      },
    ])

    const auditLog = req.scope.resolve('auditLog') as any
    await auditLog.log({
      action: 'order.fulfill',
      entity: 'order',
      entity_id: order.id,
      diff: {
        order_id: order.id,
        digital_items: digitalItems.length,
      },
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.['x-forwarded-for'] ?? null,
    })

    res.json({ message: 'Fulfillment triggered', digital_items: digitalItems.length })
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fulfill order', error: error?.message })
  }
}
