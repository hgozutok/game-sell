import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { completeCartWorkflow } from '@medusajs/core-flows'
import {
  resolveEmailLocaleFromAcceptLanguage,
  toEmailLocale,
} from '../../../../modules/email-template/locales'

export const AUTHENTICATE = false

/**
 * POST /store/orders/complete-paypal
 *
 * PayPal onay akisinin ikinci adimi.
 * Kullanici PayPal'da odemeyi onayladiktan sonra storefront bu endpoint'i cagirir.
 *
 * Body: { cart_id, paypal_token, locale? }
 *   - cart_id:      /store/orders/create'den alinan sepet id
 *   - paypal_token: PayPal'in return URL'ine ?token= parametresi olarak ekledigi PayPal order id
 *   - locale:       kullanici dili (e-posta icin)
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  // CORS
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
  }

  const logger = req.scope.resolve('logger') as any

  try {
    const { cart_id, paypal_token, locale: bodyLocale } = req.body as any

    if (!cart_id) {
      return res.status(400).json({ message: 'cart_id gerekli' })
    }
    if (!paypal_token) {
      return res.status(400).json({ message: 'paypal_token gerekli' })
    }

    const orderLocale =
      toEmailLocale(bodyLocale) ||
      resolveEmailLocaleFromAcceptLanguage(req.headers['accept-language'] as string)

    logger.info(`💰 PayPal complete: cart=${cart_id} token=${paypal_token} locale=${orderLocale}`)

    // PayPal payment session'unu bul ve token ile guncelle
    const paymentModule = req.scope.resolve(Modules.PAYMENT) as any
    const cartModule = req.scope.resolve(Modules.CART) as any

    // Cart'a bagli payment collection'i bul
    const paymentCollections = await paymentModule.listPaymentCollections({
      cart_id,
    }).catch(() => [])

    let paymentCollection = paymentCollections?.[0]

    // Eger cart_id ile bulamazsak, session'lari direkt sorgula
    if (!paymentCollection) {
      // cart metadata'da collection_id saklaniyor olabilir
      const enrichedCart = await cartModule.retrieveCart(cart_id, {}).catch(() => null)
      logger.warn(`⚠️ PayPal: payment collection cart_id ile bulunamadi, cart metadata kontrol ediliyor`)
      if (!enrichedCart) {
        return res.status(404).json({ message: 'Sepet bulunamadi' })
      }
    }

    // PayPal session'unu bul (provider_id paypal iceren)
    let paypalSession: any = null
    if (paymentCollection) {
      const sessions = await paymentModule.listPaymentSessions({
        payment_collection_id: paymentCollection.id,
      }).catch(() => [])

      paypalSession = (sessions || []).find((s: any) =>
        String(s.provider_id || '').includes('paypal')
      )
    }

    if (!paypalSession) {
      // Fallback: token (PayPal order id) ile direkt capture dene
      logger.warn(`⚠️ PayPal session bulunamadi, direkt capture deneniyor: ${paypal_token}`)
    }

    // PayPal order'in onaylandigi durum guncellenmeli.
    // PayPal, return URL'e token=<paypal_order_id> gonderiyor.
    // Session data'sindaki id ile eslesmeli — eger farkli ise session data'yi guncelle.
    if (paypalSession && paypal_token && paypalSession.data?.id !== paypal_token) {
      logger.info(`PayPal session data id'si (${paypalSession.data?.id}) != token (${paypal_token}), guncelleniyor`)
      await paymentModule.updatePaymentSession(paypalSession.id, {
        data: { ...paypalSession.data, id: paypal_token, status: 'APPROVED' },
      }).catch((e: any) => logger.warn(`session guncelleme hatasi: ${e?.message}`))
    }

    // Dijital teslimat kargo metodu ekle (eger yoksa)
    try {
      await cartModule.addShippingMethods(cart_id, [
        {
          name: 'Digital Delivery',
          amount: 0,
          shipping_option_id: 'so_digital_delivery',
        },
      ])
      logger.info('✅ Dijital teslimat metodu eklendi (PayPal complete)')
    } catch (shippingErr: any) {
      // Zaten ekli olabilir — devam et
      logger.info(`ℹ️ Kargo metodu zaten mevcut veya eklenemedi: ${shippingErr?.message}`)
    }

    // completeCartWorkflow: authorizePayment cagirir — PayPal APPROVED durumundaysa capture eder
    const { result: completed } = await completeCartWorkflow(req.scope).run({
      input: { id: cart_id },
    })

    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const order = await orderModule.retrieveOrder(completed.id, { relations: ['items'] })

    // Siparis metadata'yi guncelle
    await orderModule.updateOrders([
      {
        id: order.id,
        metadata: {
          ...(order.metadata || {}),
          locale: orderLocale,
          payment_method: 'paypal',
          payment_provider: paypalSession?.provider_id || 'pp_paypal_paypal',
          paypal_token,
          payment_status: 'captured',
        },
      },
    ]).catch(() => null)

    logger.info(`✅ PayPal order tamamlandi: ${order.id}`)

    return res.status(200).json({
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
        provider: 'paypal',
        paypal_token,
      },
      message: 'PayPal odeme basariyla tamamlandi',
    })
  } catch (error: any) {
    logger.error(`❌ PayPal complete error: ${error?.message}`, {
      stack: error?.stack,
    })
    return res.status(500).json({
      message: 'PayPal odeme tamamlanamadi',
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
