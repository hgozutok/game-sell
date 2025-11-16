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

    const [orders, count] = await Promise.all([
      orderModule.listOrders(
        {},
        {
          relations: ['items', 'items.product', 'items.variant', 'customer'],
          take: limit,
          skip: offset,
          order: { created_at: 'DESC' },
        }
      ),
      orderModule.countOrders({}),
    ])

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
      relations: ['items', 'items.product', 'items.variant'],
    })

    const digitalItems = order.items.filter((item: any) => item.product?.metadata?.is_digital === true)
    if (digitalItems.length === 0) {
      return res.status(400).json({ message: 'Order contains no digital items' })
    }

    await fulfillDigitalOrderWorkflow(req.scope).run({
      input: {
        orderId: order.id,
        customerId: order.customer_id,
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


