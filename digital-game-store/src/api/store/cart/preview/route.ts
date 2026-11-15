import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { getCurrencyRates } from '../../../../utils/currency'
import { calculateTaxAmount } from '../../../../utils/pricing'
import { resolveVariantUnitPrice } from '../../../../utils/variant-pricing'
import { applyPaymentFee } from '../../../../utils/payment-fee'

const COUNTRY_TAX_RATES: Record<string, number> = {
  us: 8,
  ca: 13,
  gb: 20,
  uk: 20,
  de: 19,
  fr: 20,
  es: 21,
  it: 22,
  nl: 21,
  be: 21,
  se: 25,
  no: 25,
  dk: 25,
  tr: 18,
  eu: 21,
}

export const AUTHENTICATE = false

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  const allowedOrigins = String(process.env.STORE_CORS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
  }

  try {
    const { items, country_code } = req.body as any

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Items array is required',
      })
    }

    const storeSettings = req.scope.resolve('storeSettings') as any

    const currencyRates = await getCurrencyRates(storeSettings)
    const defaultCurrency = await storeSettings.getSettingValue('currencies.default', 'usd')
    const configuredDisplayCurrency = await storeSettings.getSettingValue('store.display_currency', defaultCurrency)
    const taxRateSetting = await storeSettings.getSettingValue('tax.rate', 20)
    const countryRatesSetting = await storeSettings.getSettingValue('tax.country_rates', {})
    const defaultTaxRate = typeof taxRateSetting === 'number' ? taxRateSetting : parseFloat(taxRateSetting) || 0
    const normalizedCountry = typeof country_code === 'string' ? country_code.toLowerCase() : null
    // Apply admin-configured per-country tax rate when available; fallback to default tax rate
    let countryTaxRate = defaultTaxRate
    if (normalizedCountry && countryRatesSetting && typeof countryRatesSetting === 'object') {
      const configured = countryRatesSetting[normalizedCountry]
      if (typeof configured === 'number' && isFinite(configured)) {
        countryTaxRate = configured
      }
    }

    // Allow client to request a specific currency for preview
    const requestedCurrency =
      (typeof (req.body as any)?.currency_code === 'string'
        ? (req.body as any).currency_code
        : configuredDisplayCurrency) || defaultCurrency
    const displayCurrency = String(requestedCurrency).toLowerCase()

    const lineItems: any[] = []
    let subtotalMinor = 0

    for (const item of items) {
      const variantId = item.variant_id
      const quantity = Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1))

      if (!variantId) {
        continue
      }

      // Fiyat HER ZAMAN sunucuda cozumlenir — istemci price/currency alani yok sayilir.
      // Response MINOR unit (kurus) döner; storefront formatMoney(minor) ile basar.
      const resolved = await resolveVariantUnitPrice(
        req.scope,
        variantId,
        displayCurrency,
        currencyRates
      )

      const unitPrice = resolved.unitPriceMinor
      const lineSubtotal = unitPrice * quantity
      subtotalMinor += unitPrice * quantity

      lineItems.push({
        variant_id: variantId,
        quantity,
        unit_price: unitPrice,
        line_subtotal: lineSubtotal,
        product_id: item.product_id,
        title: resolved.title,
      })
    }

    const subtotal = subtotalMinor
    const taxTotal = calculateTaxAmount(subtotal, countryTaxRate)
    // Odeme komisyonu: checkout secilen saglayiciyi gonderirse uygulanir
    const requestedProvider = String((req.body as any)?.payment_method || '').toLowerCase()
    let paymentFee = null
    let total = subtotal + taxTotal
    if (requestedProvider) {
      const fee = await applyPaymentFee(
        req.scope,
        requestedProvider,
        subtotal + taxTotal,
        displayCurrency,
        currencyRates
      )
      if (fee) {
        paymentFee = {
          provider: fee.provider,
          percent: fee.percent,
          fixed_minor: fee.fixedMinor,
          fixed_currency: fee.currency,
          amount_minor: fee.feeMinor,
        }
        total += fee.feeMinor
      }
    }

    res.json({
      currency_code: displayCurrency,
      subtotal,
      tax_total: taxTotal,
      payment_fee: paymentFee,
      total,
      tax_rate: countryTaxRate,
      country_code: normalizedCountry || null,
      items: lineItems,
    })
  } catch (error: any) {
    console.error('Cart preview error:', error)
    res.status(500).json({
      message: 'Failed to calculate cart preview',
      error: error.message,
    })
  }
}

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  const allowedOrigins = String(process.env.STORE_CORS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
  }
  res.status(204).end()
}
