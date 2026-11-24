import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { fulfillDigitalOrderWorkflow } from '../../../workflows/fulfill-digital-order'

/**
 * GET /admin/order-control
 * List recent orders with complete details (customer, display_id, created_at, totals)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any

    let orders: any[] = []
    let count = 0

    try {
      const { data, metadata } = await query.graph({
        entity: 'order',
        fields: [
          'id',
          'display_id',
          'created_at',
          'status',
          'email',
          'currency_code',
          'total',
          'subtotal',
          'tax_total',
          'shipping_total',
          'customer_id',
          'customer.email',
          'customer.first_name',
          'customer.last_name',
          'customer.phone',
          'shipping_address.first_name',
          'shipping_address.last_name',
          'shipping_address.email',
          'metadata',
          'items.id',
          'items.title',
          'items.quantity',
          'items.unit_price',
          'items.total',
        ],
        pagination: {
          take: limit,
          skip: offset,
          order: { created_at: 'DESC' },
        },
      })
      orders = data || []
      count = metadata?.count ?? orders.length
    } catch {
      // Fallback to orderModule
      const orderModule = req.scope.resolve(Modules.ORDER) as any
      const [rawOrders, rawCount] = await orderModule.listAndCountOrders(
        {},
        {
          relations: ['items'],
          take: limit,
          skip: offset,
          order: { created_at: 'DESC' },
        }
      )
      orders = rawOrders || []
      count = rawCount || 0

      // Hydrate customer if missing
      const customerIds = Array.from(
        new Set(orders.map((o: any) => o.customer_id).filter(Boolean))
      )
      if (customerIds.length > 0) {
        try {
          const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
          const customers = await customerModule.listCustomers({ id: customerIds })
          const map = new Map(customers.map((c: any) => [c.id, c]))
          for (const o of orders) {
            if (o.customer_id && map.has(o.customer_id)) {
              o.customer = map.get(o.customer_id)
            }
          }
        } catch {}
      }
    }

    const mappedOrders = orders.map((o: any) => {
      const customer = o.customer || {}
      const shipping = o.shipping_address || {}
      const metadata = o.metadata || {}

      const email =
        o.email ||
        customer.email ||
        shipping.email ||
        metadata.email ||
        metadata.customer_email ||
        null

      const customerName =
        [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
        [shipping.first_name, shipping.last_name].filter(Boolean).join(' ') ||
        metadata.customer_name ||
        null

      const createdAt = o.created_at || o.createdAt || metadata.created_at || null

      const displayId = o.display_id ?? metadata.display_id ?? null

      const total =
        o.total ??
        (o.items || []).reduce(
          (sum: number, item: any) =>
            sum + Number(item.unit_price || 0) * Number(item.quantity || 0),
          0
        )

      return {
        id: o.id,
        display_id: displayId,
        created_at: createdAt,
        status: o.status,
        payment_status:
          o.payment_status ||
          metadata.payment_status ||
          (metadata.payment_approved ? 'captured' : 'awaiting'),
        email: email,
        customer_name: customerName,
        customer_email: customer.email || email,
        total: total,
        currency_code: o.currency_code || 'usd',
        metadata: metadata,
        items: o.items || [],
      }
    })

    res.json({ orders: mappedOrders, count, limit, offset })
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


