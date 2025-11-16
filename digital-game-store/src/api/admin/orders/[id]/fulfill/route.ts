import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { fulfillDigitalOrderWorkflow } from '../../../../workflows/fulfill-digital-order'

export const AUTHENTICATE = false // Enable auth in production

/**
 * POST /admin/orders/:id/fulfill
 * Triggers digital fulfillment for a specific order
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any

    const { id: orderId } = req.params
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

    res.json({ message: 'Fulfillment triggered' })
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fulfill order', error: error?.message })
  }
}


