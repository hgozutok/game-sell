import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { completeCartWorkflow } from '@medusajs/core-flows'

export const AUTHENTICATE = false

/**
 * POST /store/orders/complete
 * Stripe (ve diger istemci onayi gerektiren saglayicilar) icin ikinci adim:
 * kart onayi alindiktan sonra cagrilir, cart'i siparise cevirir.
 *
 * Body: { cart_id: string }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
  }

  const logger = req.scope.resolve('logger') as any
  const cartId = (req.body as any)?.cart_id

  if (!cartId) {
    return res.status(400).json({ message: 'cart_id is required' })
  }

  try {
    const cartModule = req.scope.resolve(Modules.CART) as any
    const cart = await cartModule
      .retrieveCart(cartId, { relations: ['items', 'shipping_methods'] })
      .catch(() => null)

    if (!cart) {
      return res.status(404).json({ message: 'Cart bulunamadi' })
    }

    // completeCartWorkflow requires_shipping kontrolu icin dijital teslimat metodu
    const existingMethods = cart.shipping_methods || []
    if (existingMethods.length === 0) {
      await cartModule.addShippingMethods(cart.id, [
        {
          name: 'Digital Delivery',
          amount: 0,
          shipping_option_id: 'so_digital_delivery',
        },
      ])
    }

    const { result: completed } = await completeCartWorkflow(req.scope).run({
      input: { id: cart.id },
    })

    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const order = await orderModule.retrieveOrder(completed.id, { relations: ['items'] })

    // Ödeme yöntemi siparişte görünsün (Stripe akışında body'den gelir)
    const paymentMethod = String((req.body as any)?.payment_method || 'stripe').replace(/_/g, '-')
    await orderModule
      .updateOrders([
        {
          id: order.id,
          metadata: {
            ...(order.metadata || {}),
            payment_method: paymentMethod,
          },
        },
      ])
      .catch(() => null)

    logger.info(`[stripe-complete] order ${order.id} olusturuldu`)

    res.status(201).json({
      order: {
        id: order.id,
        status: order.status,
        email: order.email,
        total: order.total,
        items: order.items,
      },
      message: 'Order completed successfully',
    })
  } catch (error: any) {
    logger.error(`[stripe-complete] hata: ${error?.message}`, { stack: error?.stack })
    res.status(500).json({
      message: 'Failed to complete order',
      error: error?.message,
    })
  }
}

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
  }
  res.status(204).end()
}
