import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import {
  completeCartWorkflow,
  createPaymentCollectionForCartWorkflow,
} from '@medusajs/core-flows'
import { getCurrencyRates, convertCurrencyAmount } from '../../../../utils/currency'
import { resolveVariantUnitPrice } from '../../../../utils/variant-pricing'
import { applyPaymentFee } from '../../../../utils/payment-fee'
import {
  checkOrderRateLimit,
  guardCartForCompletion,
  isAllowedPaymentProvider,
  releaseCompletionLock,
  requireVerifiedCustomerForOrder,
} from '../../../../utils/order-guard'
import { verifyEmailNotBlacklisted } from '../../../../utils/email-blacklist'
import { buildCustomerIpMetadata } from '../../../../utils/customer-status'
import { clientIp } from '../../../../utils/bot-protection'
import {
  resolveEmailLocaleFromAcceptLanguage,
  toEmailLocale,
} from '../../../../modules/email-template/locales'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Create order from checkout data
 * POST /store/orders/create
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Bot flood korumasi: IP basina siparis denemesi sinirlandirilir.
    const limited = checkOrderRateLimit(req, 'order-create', 30)
    if (limited) {
      return res.status(limited.status!).json({ code: limited.code, message: limited.message })
    }

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
    const {
      items,
      email,
      billing_address,
      shipping_address,
      payment_method,
      locale: bodyLocale,
    } = req.body as any

    // Siparis e-postalari alicinin dilinde gonderilir; tespit edilemezse Ingilizce.
    const orderLocale =
      toEmailLocale(bodyLocale) ||
      resolveEmailLocaleFromAcceptLanguage(req.headers['accept-language'] as string)

    logger.info(`📦 Creating order from checkout... (locale=${orderLocale})`)

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

    // Odeme saglayici izin listesi: pp_system_default gibi sistem/gelistirme
    // saglayicilariyla siparis olusturulamaz (botlarin parasiz siparis vektoru).
    if (!isAllowedPaymentProvider(String(payment_method || 'bank-transfer'))) {
      logger.warn(`⚠️ Izinsiz odeme saglayicisi reddedildi: ${payment_method}`)
      return res.status(403).json({
        code: 'payment_provider_not_allowed',
        message: 'Geçersiz ödeme yöntemi',
      })
    }

    // Onaylanmamis kullanici siparis veremez (orders.require_verified_customer,
    // varsayilan acik): giris yapilmis + e-postasi dogrulanmis hesap zorunlu.
    const customerGate = await requireVerifiedCustomerForOrder(req)
    if (!customerGate.ok) {
      logger.warn(`🚫 Musteri kapisi red: code=${customerGate.code}`)
      return res.status(customerGate.status || 403).json({
        code: customerGate.code,
        message: customerGate.message,
      })
    }
    // Girili dogrulanmis musteri varsa siparis e-postasi HESAPTAN gelir;
    // istemciden gelen e-posta guvenilmez (baskasinin e-postasiyla siparis engeli).
    const orderEmail = String(customerGate.customer?.email || email || '').trim().toLowerCase()

    // E-posta kara listesi: tam adres veya alan adi engelliyse siparis reddedilir.
    const blacklistCheck = await verifyEmailNotBlacklisted(req.scope, orderEmail)
    if (!blacklistCheck.ok) {
      logger.warn(`🚫 Kara listeli e-posta siparis denemesi: ${orderEmail}`)
      return res.status(blacklistCheck.status || 403).json({
        code: blacklistCheck.code,
        message: blacklistCheck.message,
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

    // Find or create customer (dogrulanmis giris varsa zaten elimizde)
    let customer = customerGate.customer || null
    try {
      if (!customer) {
        const customers = await customerModule.listCustomers({ email: orderEmail })
        customer = customers?.[0]

        if (!customer) {
          // Create customer
          customer = await customerModule.createCustomers({
            email: orderEmail,
            first_name: billing_address.first_name || '',
            last_name: billing_address.last_name || '',
          })
          logger.info(`✅ Created customer: ${orderEmail}`)
        }
      }

      // Checkout dili hesap tercihine yazilir - sonraki e-postalar da bu dilde gider
      if (customer?.id) {
        const currentMetadata =
          customer.metadata && typeof customer.metadata === 'object'
            ? customer.metadata
            : {}
        const currentPrefs =
          currentMetadata.prefs && typeof currentMetadata.prefs === 'object'
            ? currentMetadata.prefs
            : {}
        // Siparis IP'si musteriye de yazilir — kullanici listesinden IP engelleme
        // bu iz uzerinden yapilir (botun tum adresleri ips[]'de birikir).
        const ipPatch = buildCustomerIpMetadata(currentMetadata, clientIp(req))
        await customerModule
          .updateCustomers(customer.id, {
            metadata: {
              ...currentMetadata,
              ...ipPatch,
              prefs: {
                ...currentPrefs,
                locale: orderLocale,
              },
            },
          })
          .catch(() => null)
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
      email: orderEmail,
      ...(defaultChannel?.id ? { sales_channel_id: defaultChannel.id } : {}),
      shipping_address: shipping_address,
      billing_address: billing_address,
      metadata: {
        payment_method: payment_method || 'paypal',
        payment_status: 'pending',
        locale: orderLocale,
        // Siparis IP'si — bot teshisi + musteri IP engelleme icin iz
        customer_ip: clientIp(req),
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
      // Fiyat cozumleme ortak util uzerinden — query.graph + kinguin fallback.
      // (Eski inline remoteLink/retrieveVariant yolu bu surumde sessizce kopuyordu.)
      const resolved = await resolveVariantUnitPrice(req.scope, variantId, regionCurrency, rates)
      unitPrice = resolved.unitPriceMinor
      if (resolved.title) {
        title = resolved.title
      }
      if (unitPrice === 0) {
        logger.warn(`⚠️ fiyat cozumlenemedi (${variantId}) — satir 0 ile eklenmeyecek`)
        continue
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
    let cartTotal = Math.round(
      lineItems.reduce((sum: number, li: any) => sum + Number(li.unit_price || 0) * Number(li.quantity || 0), 0)
    )
    const cartCurrency = String(enrichedCart.currency_code || regionCurrency).toLowerCase()

    if (!(cartTotal > 0)) {
      return res.status(400).json({ message: 'Cart total is zero — variant prices missing' })
    }

    // Odeme komisyonu: admin panelde tanimliysa sepete ayri satir olarak eklenir
    // (siparis toplami ve tahsilat tutari tutarli kalir).
    const requestedProvider = String(payment_method || 'bank-transfer').replace(/^pp_/, '')
    let paymentFeeMinor = 0
    try {
      const fee = await applyPaymentFee(req.scope, requestedProvider, cartTotal, cartCurrency, rates)
      if (fee && fee.feeMinor > 0) {
        paymentFeeMinor = fee.feeMinor
        if (typeof cartModule.addLineItems === 'function') {
          await cartModule.addLineItems(cart.id, [
            {
              title: 'Payment processing fee',
              quantity: 1,
              unit_price: paymentFeeMinor,
              // dijital urun — kargo validasyonuna takilmasin
              requires_shipping: false,
              // order-guard bu satiri varyantsiz ozel kalem olarak taniyacak
              metadata: { is_payment_fee: true, provider: requestedProvider },
            },
          ])
        }
        cartTotal += paymentFeeMinor
        logger.info(`💳 odeme komisyonu: ${requestedProvider} -> +${paymentFeeMinor} ${cartCurrency}`)
      }
    } catch (feeErr: any) {
      logger.warn(`⚠️ odeme komisyonu eklenemedi: ${feeErr?.message}`)
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

    // Sepet ust limiti: admin panelde tanimliysa (cart.max_total_eur) siparis
    // toplami (komisyon dahil) asamaz. EUR'dan siparis kuruna cevrilir.
    const cartMaxEur = Number(await storeSettings.getSettingValue('cart.max_total_eur', 0)) || 0
    if (cartMaxEur > 0) {
      const maxMinor = Math.round(cartMaxEur * 100)
      const totalInEur = convertCurrencyAmount(cartTotal, cartCurrency, 'eur', rates)
      if (totalInEur > maxMinor) {
        return res.status(400).json({
          code: 'cart_limit_exceeded',
          message: `Sepet toplamı mağaza üst limitini (${cartMaxEur} EUR) aşıyor. Lütfen sepetinizi azaltın.`,
        })
      }
    }

    const sessionBase = {
      currency_code: cartCurrency,
      amount: cartTotal,
      context: { cart: { email: orderEmail, id: cart.id } },
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

    // PayPal: kullaniciyi PayPal onay sayfasina yonlendir.
    // completeCartWorkflow SONRA cagrilir (musteri PayPal'da onaylayip dondukten sonra).
    if (String(paymentSession.provider_id || requestedProvider).includes('paypal')) {
      const paypalOrderId = paymentSession.data?.id
      const isSandbox = String(process.env.PAYPAL_ENV || '').toLowerCase() === 'sandbox'
      const fallbackApprove = paypalOrderId
        ? `${isSandbox ? 'https://www.sandbox.paypal.com' : 'https://www.paypal.com'}/checkoutnow?token=${paypalOrderId}`
        : null

      const approveUrl =
        paymentSession.data?.approve_url ||
        (paymentSession.data?.links || []).find((l: any) => l.rel === 'approve' || l.rel === 'payer-action')?.href ||
        (paymentSession.data?.links || []).find((l: any) => l.method === 'GET' && l.rel !== 'self')?.href ||
        fallbackApprove

      logger.info(`[PayPal] Session data: ${JSON.stringify(paymentSession.data)} -> approveUrl: ${approveUrl}`)

      if (!approveUrl) {
        logger.error(`[PayPal] approveUrl alinamadi! Session:`, paymentSession)
        return res.status(400).json({
          message: 'PayPal onay bağlantısı oluşturulamadı. Lütfen tekrar deneyin.',
        })
      }

      return res.status(201).json({
        requires_redirect: true,
        cart_id: cart.id,
        payment: {
          collection_id: paymentCollection.id,
          session_id: paymentSession.id,
          provider: paymentSession.provider_id,
          paypal_order_id: paypalOrderId || null,
          approve_url: approveUrl,
        },
        message: 'PayPal onay sayfasina yonlendiriliyor',
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
    //    Oncesi: fiyat + saglayici + tekrar korumasi (order-guard).
    //    requireAuthorized=false — bank-transfer'de yetkilendirme workflow icinde yapilir.
    const guard = await guardCartForCompletion(req.scope, cart.id, {
      requireAuthorized: false,
    })
    if (!guard.ok) {
      logger.warn(`🚫 order-guard red: cart=${cart.id} code=${guard.code}`)
      return res.status(guard.status || 400).json({
        code: guard.code,
        message: guard.message,
      })
    }

    let completed: any
    try {
      const workflowResult = await completeCartWorkflow(req.scope).run({
        input: { id: cart.id },
      })
      completed = workflowResult.result
    } finally {
      releaseCompletionLock(cart.id)
    }
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
    let paymentReference: string | null = null
    if (requestedProvider === 'bank-transfer' || requestedProvider === 'bank_transfer') {
      paymentInstructions = {}
      for (const key of instructionKeys) {
        paymentInstructions[key] = await storeSettings.getSettingValue(
          `payment.bank_transfer.${key}`,
          ''
        )
      }
      // Musterinin havale aciklamasina yazacagi referans: siparis numarasina bagli,
      // tahmin edilemez olmayan ama tekil bir kod (HUPI-<display_id>).
      paymentReference = `HUPI-${order.display_id ?? order.id}`
    }

    await orderModule
      .updateOrders([
        {
          id: order.id,
          metadata: {
            ...(order.metadata || {}),
            locale: orderLocale,
            payment_method: requestedProvider,
            payment_provider: paymentSession.provider_id,
            ...(paymentFeeMinor > 0
              ? { payment_fee_minor: paymentFeeMinor, payment_fee_currency: cartCurrency }
              : {}),
            ...(paymentInstructions ? { payment_instructions: paymentInstructions } : {}),
            ...(paymentReference
              ? { payment_reference: paymentReference, payment_status: 'awaiting_transfer' }
              : {}),
          },
        },
      ])
      .catch(() => null)

    logger.info(`✅ Order created: ${order.id} (odeme authorized)`)

    res.status(201).json({
      order: {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        email: order.email,
        total: order.total,
        currency_code: order.currency_code,
        items: order.items,
      },
      payment: {
        collection_id: paymentCollection.id,
        session_id: paymentSession.id,
        provider: paymentSession.provider_id,
        // Banka havalesinde musteriye gosterilecek referans ve hesap bilgileri
        reference: paymentReference,
        instructions: paymentInstructions,
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

