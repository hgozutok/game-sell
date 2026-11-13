import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { fulfillDigitalOrderWorkflow } from '../../../workflows/fulfill-digital-order'

export const AUTHENTICATE = false // Enable auth in production

/**
 * GET /admin/order-control
 * List recent orders with basic details
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any

    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    // countOrders servis metodolojisinde yok; listAndCountOrders tek sorguda doner.
    const [orders, count] = await orderModule.listAndCountOrders(
      {},
      {
        // items.product / items.variant cross-module link; order modulu JOINED stratejisiyle
        // cozemiyor (Cannot read properties of undefined). Sadece items yuklenir.
        relations: ['items'],
        take: limit,
        skip: offset,
        order: { created_at: 'DESC' },
      }
    )

    res.json({ orders, count, limit, offset })
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to list orders', error: error?.message })
  }
}

/**
 * POST /admin/order-control/fulfill
 * Body: { order_id: string }
 * Triggers digital fulfillment workflow for the order
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const logger = req.scope.resolve('logger') as any
    const orderModule = req.scope.resolve(Modules.ORDER) as any

    const { order_id: orderId } = req.body as any
    if (!orderId) {
      return res.status(400).json({ message: 'order_id is required' })
    }

    const order = await orderModule.retrieveOrder(orderId, {
      relations: ['items'],
    })

    // Ödeme ve sipariş onayı olmadan key gönderimi yok
    const metadata = order.metadata || {}
    const paidStatuses = ['captured', 'partially_captured']
    const paymentApproved =
      metadata.payment_approved === true || paidStatuses.includes(String(order.payment_status))
    const orderApproved = metadata.order_approved === true
    if (!paymentApproved || !orderApproved) {
      return res.status(409).json({
        message: 'Key gönderilemez: ödeme ve sipariş onayı gerekli.',
        payment_approved: paymentApproved,
        order_approved: orderApproved,
      })
    }

    // items.product relation'i order modulunde cozulemiyor; urunleri ayri modulden cek.
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const productIds = Array.from(
      new Set(order.items.map((item: any) => item.product_id).filter(Boolean))
    )
    const products = productIds.length ? await productModule.listProducts({ id: productIds }) : []
    const productsById = new Map(products.map((p: any) => [p.id, p]))

    const flaggedItems = order.items.filter((item: any) => {
      const product: any = productsById.get(item.product_id)
      return product?.metadata?.is_digital === true || item.metadata?.is_digital === true
    })

    // Magaza tamamen dijital anahtar satiyor; urun metadata'si isaretlenmemisse
    // tum kalemler dijital kabul edilir.
    const digitalItems = flaggedItems.length > 0 ? flaggedItems : order.items

    if (digitalItems.length === 0) {
      return res.status(400).json({ message: 'Order contains no items' })
    }

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

    logger.info(`Manual digital fulfillment triggered for order ${orderId}`)
    res.json({ message: 'Fulfillment triggered' })
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fulfill order', error: error?.message })
  }
}


