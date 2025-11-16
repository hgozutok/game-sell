import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

const COUNTRY_TAX_RATES_KEY = 'tax.country_rates'

export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
  }
  const storeSettings = req.scope.resolve('storeSettings') as any
  const map = (await storeSettings.getSettingValue(COUNTRY_TAX_RATES_KEY, {})) || {}
  res.json({
    country_tax_rates: map,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
  }
  const storeSettings = req.scope.resolve('storeSettings') as any
  const { country_tax_rates } = req.body as any

  if (!country_tax_rates || typeof country_tax_rates !== 'object') {
    return res.status(400).json({
      message: 'country_tax_rates object is required',
    })
  }

  // normalize keys to lowercase, values to numbers >= 0
  const normalized: Record<string, number> = {}
  for (const [key, value] of Object.entries(country_tax_rates)) {
    const code = String(key).toLowerCase()
    const num = Number(value)
    if (!code || !isFinite(num)) continue
    normalized[code] = Math.max(0, num)
  }

  await storeSettings.setSetting(COUNTRY_TAX_RATES_KEY, normalized, {
    category: 'tax',
    description: 'Per-country tax rate map (%)',
  })

  res.json({
    message: 'Country tax rates updated',
    country_tax_rates: normalized,
  })
}


