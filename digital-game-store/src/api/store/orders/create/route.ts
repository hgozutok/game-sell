import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Create order from checkout data
 * POST /store/orders/create
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const logger = req.scope.resolve('logger') as any
    const { items, email, billing_address, shipping_address, payment_method } = req.body as any

    logger.info('📦 Creating order from checkout...')

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Items are required',
      })
    }

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
      })
    }

    if (!billing_address || !shipping_address) {
      return res.status(400).json({
        message: 'Billing and shipping addresses are required',
      })
    }

    // Get services
    const cartModule = req.scope.resolve(Modules.CART) as any
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const regionModule = req.scope.resolve(Modules.REGION) as any
    const salesChannelModule = req.scope.resolve(Modules.SALES_CHANNEL) as any

    // Get default region (auto-create one if none exist)
    let regions = await regionModule.listRegions()
    let defaultRegion = regions?.[0]

    if (!defaultRegion) {
      try {
        defaultRegion = await regionModule.createRegions({
          name: 'United States',
          currency_code: 'usd',
          countries: ['us'],
          automatic_taxes: false,
          metadata: {
            currency_symbol: '$',
          },
        })
        // refresh regions list for consistency
        regions = await regionModule.listRegions()
      } catch (createRegionErr: any) {
        return res.status(500).json({
          message: 'No region found and failed to create a default region',
          error: createRegionErr.message,
        })
      }
    }

    if (!defaultRegion) {
      return res.status(500).json({
        message: 'No region found. Please configure a region in Medusa admin.',
      })
    }

    // Get default sales channel (optional - proceed if not found)
    let defaultChannel = null as any
    try {
      const salesChannels = await salesChannelModule.listSalesChannels({ name: 'Default Sales Channel' })
      defaultChannel = salesChannels?.[0] || null
    } catch (scErr: any) {
      // ignore, we'll proceed without a sales channel
    }

    if (!defaultChannel) {
      try {
        defaultChannel = await salesChannelModule.createSalesChannels({
          name: 'Default Sales Channel',
          description: 'Auto-created default channel',
          is_disabled: false,
        })
      } catch (createScErr: any) {
        // proceed without a sales channel
        defaultChannel = null
      }
    }

    // Find or create customer
    let customer = null
    try {
      const customers = await customerModule.listCustomers({ email })
      customer = customers?.[0]
      
      if (!customer) {
        // Create customer
        customer = await customerModule.createCustomers({
          email,
          first_name: billing_address.first_name || '',
          last_name: billing_address.last_name || '',
        })
        logger.info(`✅ Created customer: ${email}`)
      }
    } catch (customerError: any) {
      logger.warn(`⚠️ Customer creation/retrieval failed:`, customerError.message)
      // Continue without customer for now
    }

    // Create cart
    const cartPayload: any = {
      region_id: defaultRegion.id,
      items: items.map((item: any) => ({
        variant_id: item.variant_id,
        quantity: item.quantity || 1,
      })),
      customer_id: customer?.id,
      email: email,
      ...(defaultChannel?.id ? { sales_channel_id: defaultChannel.id } : {}),
      shipping_address: shipping_address,
      billing_address: billing_address,
      metadata: {
        payment_method: payment_method || 'paypal',
        payment_status: 'pending',
      },
    }

    const cart = await cartModule.createCarts(cartPayload)

    logger.info(`✅ Created cart: ${cart.id} with payment method: ${payment_method}`)

    // Complete cart (create order)
    const order = await cartModule.completeCarts(cart.id)

    logger.info(`✅ Order created: ${order.id}`)

    res.status(201).json({
      order: {
        id: order.id,
        status: order.status,
        email: order.email,
        total: order.total,
        items: order.items,
      },
      message: 'Order created successfully',
    })
  } catch (error: any) {
    const logger = req.scope.resolve('logger') as any
    logger.error(`❌ Order creation error: ${error?.message}`, {
      stack: error?.stack,
      cause: error?.cause,
    })

    res.status(500).json({
      message: 'Failed to create order',
      error: error?.message,
      details: error?.stack,
    })
  }
}

