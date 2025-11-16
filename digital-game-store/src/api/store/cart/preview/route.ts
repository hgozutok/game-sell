import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { getCurrencyRates } from '../../../../utils/currency'
import { getVariantPriceInCurrency, calculateTaxAmount } from '../../../../utils/pricing'

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
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  try {
    const { items, country_code } = req.body as any

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Items array is required',
      })
    }

    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const storeSettings = req.scope.resolve('storeSettings') as any

    const currencyRates = await getCurrencyRates(storeSettings)
    const defaultCurrency = await storeSettings.getSettingValue('currencies.default', 'usd')
    const displayCurrency = await storeSettings.getSettingValue('store.display_currency', defaultCurrency)
    const taxRateSetting = await storeSettings.getSettingValue('tax.rate', 20)
    const defaultTaxRate = typeof taxRateSetting === 'number' ? taxRateSetting : parseFloat(taxRateSetting) || 0
    const normalizedCountry = typeof country_code === 'string' ? country_code.toLowerCase() : null
    const countryTaxRate = normalizedCountry && COUNTRY_TAX_RATES[normalizedCountry] !== undefined
      ? COUNTRY_TAX_RATES[normalizedCountry]
      : defaultTaxRate

    const lineItems: any[] = []
    let subtotal = 0

    for (const item of items) {
      const variantId = item.variant_id
      const quantity = Math.max(1, parseInt(item.quantity, 10) || 1)

      if (!variantId) {
        continue
      }

      const variants = await productModule.listProductVariants({ id: variantId })
      const variant = variants?.[0]

      if (!variant) {
        continue
      }

      const variantPrices = await productModule.listProductVariantPrices({ variant_id: variantId })
      const variantWithPrices = {
        ...variant,
        prices: variantPrices,
      }

      let unitPrice = getVariantPriceInCurrency(variantWithPrices, displayCurrency, currencyRates) || 0
      if (unitPrice <= 0 && item.price) {
        unitPrice = item.price
      }
      const lineSubtotal = unitPrice * quantity
      subtotal += lineSubtotal

      lineItems.push({
        variant_id: variantId,
        quantity,
        unit_price: unitPrice,
        line_subtotal: lineSubtotal,
        product_id: variant.product_id,
        title: variant.title,
      })
    }

    const taxTotal = calculateTaxAmount(subtotal, countryTaxRate)
    const total = subtotal + taxTotal

    res.json({
      currency_code: displayCurrency,
      subtotal,
      tax_total: taxTotal,
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

