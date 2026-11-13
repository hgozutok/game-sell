import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import {
  completeCartWorkflow,
  createPaymentCollectionForCartWorkflow,
} from '@medusajs/core-flows'
import { getCurrencyRates, convertCurrencyAmount } from '../../../../utils/currency'
import { computePriceForKinguinProduct } from '../../../../utils/kinguin-sync'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Create order from checkout data
 * POST /store/orders/create
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // CORS headers for storefront requests with credentials
    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
    }
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
    const storeSettings = req.scope.resolve('storeSettings') as any

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
        // ensure defaultRegion points to a valid region object
        defaultRegion = regions?.[0] || defaultRegion
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

    // Create empty cart (we'll add items after to ensure proper enrichment)
    const cartPayload: any = {
      region_id: defaultRegion.id,
      currency_code: (defaultRegion as any).currency_code || 'usd',
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

    // Prepare line items with titles and unit prices (in region currency)
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const regionCurrency: string = String((defaultRegion as any).currency_code || 'usd').toLowerCase()
    const rates: Record<string, number> = await getCurrencyRates(storeSettings)
    const lineItems: Array<any> = []
    for (const it of items as any[]) {
      const variantId = it?.variant_id
      const quantity = Math.max(1, parseInt(it?.quantity, 10) || 1)
      if (!variantId) {
        continue
      }

      let title = 'Item'
      let unitPrice = 0
      try {
        logger.info(`🔧 fiyat cozumleme basladi: variant=${variantId}`)
        // Fiyatlari fiyat modulunden oku (variant -> price_set linki uzerinden)
        const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any
        const pricingModule = req.scope.resolve(Modules.PRICING) as any
        let prices: any[] = []
        try {
          const links = await remoteLink.list({
            [Modules.PRODUCT]: { variant_id: variantId },
          })
          const priceSetId = links?.[0]?.pricing?.price_set_id
          if (priceSetId) {
            const priceSet = await pricingModule.retrievePriceSet(priceSetId, {
              relations: ['prices'],
            })
            prices = priceSet?.prices || []
          }
        } catch {
          /* fiyat seti yok — fallback asagida */
        }
        if (prices.length === 0) {
          const variants = await productModule.listProductVariants(
            { id: variantId },
            { relations: ['prices'] }
          ).catch(() => [])
          const variant = Array.isArray(variants) ? variants[0] : variants
          prices = Array.isArray(variant?.prices) ? variant.prices : []
          if (variant?.title) {
            title = String(variant.title)
          }
        }
        if (prices.length > 0) {
          const direct = prices.find((p) => String(p.currency_code || '').toLowerCase() === regionCurrency)
          if (direct && typeof direct.amount === 'number') {
            unitPrice = Math.round(Number(direct.amount))
          } else if (prices.length > 0) {
            const base = prices[0]
            const fromCur = String(base.currency_code || 'usd').toLowerCase()
            const baseAmt = Number(base?.amount || 0)
            try {
              unitPrice = convertCurrencyAmount(baseAmt, fromCur, regionCurrency, rates)
            } catch {
              unitPrice = baseAmt || 0
            }
          }
        }
        // Fiyat motoru fallback — kinguin maliyetinden satis fiyati (USD -> bolge parası)
        if (unitPrice === 0) {
          try {
            const kinguin = req.scope.resolve('kinguin') as any
            const kSettings = await kinguin.getSettings()
            const kpRows =
              (await kinguin.listKinguinProducts({ medusa_variant_id: variantId }).catch(() => [])) ||
              []
            let kp = kpRows[0]
            if (!kp) {
              // urun id ile dene
              const prod = await productModule.retrieveProduct(
                (await productModule.retrieveVariant(variantId)).product_id,
                { relations: [] }
              ).catch(() => null)
              if (prod) {
                const rows = await kinguin.listKinguinProducts({ medusa_product_id: prod.id }).catch(() => [])
                kp = rows[0]
              }
            }
            if (kp) {
              const computed = await computePriceForKinguinProduct(req.scope, kp, kSettings)
              if (!computed.negative && computed.sellMinor > 0) {
                unitPrice = convertCurrencyAmount(computed.sellMinor, 'usd', regionCurrency, rates)
                title = title === 'Item' ? String(kp.name) : title
                logger.info(`💱 fiyat motoru fallback: ${kp.name} -> ${unitPrice} ${regionCurrency}`)
              }
            }
          } catch (e: any) {
            logger.warn(`⚠️ fiyat motoru fallback hatasi: ${e?.message}`)
          }
        }
      } catch (priceErr: any) {
        logger.warn(`⚠️ fiyat cozumleme hatasi (${variantId}): ${priceErr?.message}`)
      }

      lineItems.push({
        variant_id: variantId,
        quantity,
        title,
        unit_price: unitPrice,
      })
    }

    if (typeof cartModule.addLineItems === 'function') {
      await cartModule.addLineItems(cart.id, lineItems)
    } else if (typeof cartModule.addLineItem === 'function') {
      for (const li of lineItems) {
        await cartModule.addLineItem(cart.id, li)
      }
    } else {
      return res.status(500).json({
        message: 'Unable to add items to cart: addLineItems/addLineItem not available',
      })
    }

    // ---- GERCEK ODEME AKISI (Medusa payment collection) ----
    // 1) Cart toplamlarini al
    const enrichedCart = await cartModule.retrieveCart(cart.id, {
      relations: ['items'],
    })
    logger.info(
      `DEBUG cart ${cart.id}: total=${enrichedCart.total} subtotal=${enrichedCart.subtotal} item_count=${(enrichedCart.items || []).length} ` +
      `items=${JSON.stringify((enrichedCart.items || []).map((i: any) => ({ unit_price: i.unit_price, total: i.total, title: i.title })))}`
    )
    // Modul totals hesaplamayabilir — toplami satirlardan hesapla
    const cartTotal = Math.round(
      lineItems.reduce((sum: number, li: any) => sum + Number(li.unit_price || 0) * Number(li.quantity || 0), 0)
    )
    const cartCurrency = String(enrichedCart.currency_code || regionCurrency).toLowerCase()

    if (!(cartTotal > 0)) {
      return res.status(400).json({ message: 'Cart total is zero — variant prices missing' })
    }

    // 2) Payment collection olustur ve cart'a bagla
    const { result: paymentCollection } = await createPaymentCollectionForCartWorkflow(req.scope)
      .run({
        input: {
          cart_id: cart.id,
          metadata: { source: 'storefront-checkout' },
        },
      })
    logger.info(`✅ Payment collection: ${paymentCollection.id} (${cartTotal} ${cartCurrency})`)

    // 3) Provider icin payment session ac
    const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
    const requestedProvider = String(payment_method || 'bank-transfer').replace(/^pp_/, '')

    const sessionBase = {
      currency_code: cartCurrency,
      amount: cartTotal,
      context: { cart: { email, id: cart.id } },
    }
    // Provider kayit id'leri: pp_<modul>_<servis> (or: pp_bank-transfer_bank-transfer)
    const candidates = [
      `pp_${requestedProvider}_${requestedProvider}`,
      `pp_${requestedProvider}`,
      requestedProvider,
    ]
    let paymentSession: any
    let lastSessionErr: any = null
    for (const candidate of candidates) {
      try {
        paymentSession = await paymentModule.createPaymentSession(
          paymentCollection.id,
          { provider_id: candidate, ...sessionBase }
        )
        break
      } catch (e: any) {
        lastSessionErr = e
      }
    }
    if (!paymentSession) {
      throw lastSessionErr || new Error('No payment provider available for ' + requestedProvider)
    }
    logger.info(`✅ Payment session: ${paymentSession.id} (${paymentSession.provider_id})`)

    // Stripe gibi istemci onayi gerektiren saglayicilar: siparisi hemen tamamlama.
    // Storefront once Stripe Elements ile karti onaylar, sonra /store/orders/complete cagirir.
    if (String(paymentSession.provider_id || requestedProvider).includes('stripe')) {
      const clientSecret =
        paymentSession.data?.client_secret ||
        paymentSession.data?.payment_intent_client_secret ||
        null

      if (!clientSecret) {
        return res.status(502).json({
          message: 'Stripe oturumu olusturulamadi (client_secret yok). STRIPE_API_KEY dogru mu?',
        })
      }

      return res.status(201).json({
        requires_action: true,
        cart_id: cart.id,
        payment: {
          collection_id: paymentCollection.id,
          session_id: paymentSession.id,
          provider: paymentSession.provider_id,
          client_secret: clientSecret,
        },
        message: 'Stripe odeme onayi bekleniyor',
      })
    }

    // 4) Dijital teslimat kargo metodu (completeCart requires_shipping kontrolu)
    //    Modul seviyesinde eklenir — fulfillment context validasyonu atlanir.
    await cartModule.addShippingMethods(cart.id, [
      {
        name: 'Digital Delivery',
        amount: 0,
        shipping_option_id: 'so_digital_delivery',
      },
    ])
    logger.info('✅ Dijital teslimat metodu eklendi')

    // 5) Siparisi olustur — completeCartWorkflow provider authorizePayment'i
    //    calistirir (bank-transfer sandbox'ta authorized dondurur;
    //    stripe/paypal/mollie icin istemci onayi sonrasi status authorized olmalidir).
    const { result: completed } = await completeCartWorkflow(req.scope).run({
      input: { id: cart.id },
    })
    // Output sadece order id tasir — siparis detayini order modulunden al
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const order = await orderModule.retrieveOrder(completed.id, { relations: ['items'] })

    // Ödeme yöntemi siparişte görünsün (admin sipariş detayı)
    const instructionKeys = [
      'bank_name',
      'account_name',
      'iban',
      'account_number',
      'sort_code',
      'swift',
      'note',
    ]
    let paymentInstructions: Record<string, any> | null = null
    if (requestedProvider === 'bank-transfer' || requestedProvider === 'bank_transfer') {
      paymentInstructions = {}
      for (const key of instructionKeys) {
        paymentInstructions[key] = await storeSettings.getSettingValue(
          `payment.bank_transfer.${key}`,
          ''
        )
      }
    }

    await orderModule
      .updateOrders([
        {
          id: order.id,
          metadata: {
            ...(order.metadata || {}),
            payment_method: requestedProvider,
            payment_provider: paymentSession.provider_id,
            ...(paymentInstructions ? { payment_instructions: paymentInstructions } : {}),
          },
        },
      ])
      .catch(() => null)

    logger.info(`✅ Order created: ${order.id} (odeme authorized)`)

    res.status(201).json({
      order: {
        id: order.id,
        status: order.status,
        email: order.email,
        total: order.total,
        items: order.items,
      },
      payment: {
        collection_id: paymentCollection.id,
        session_id: paymentSession.id,
        provider: paymentSession.provider_id,
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

// Preflight for CORS
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

