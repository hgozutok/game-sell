import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

const PROVIDER_KEYS = {
  codeswholesale: 'provider.currency.codeswholesale',
  kinguin: 'provider.currency.kinguin',
}

const PROVIDER_DEFAULTS: Record<keyof typeof PROVIDER_KEYS, string> = {
  codeswholesale: 'usd',
  kinguin: 'eur',
}

export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettings = req.scope.resolve('storeSettings') as any

  const codeswholesaleCurrency = await storeSettings.getSettingValue(
    PROVIDER_KEYS.codeswholesale,
    PROVIDER_DEFAULTS.codeswholesale
  )
  const kinguinCurrency = await storeSettings.getSettingValue(
    PROVIDER_KEYS.kinguin,
    PROVIDER_DEFAULTS.kinguin
  )

  res.json({
    codeswholesale_currency: codeswholesaleCurrency,
    kinguin_currency: kinguinCurrency,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettings = req.scope.resolve('storeSettings') as any
  const { codeswholesale_currency, kinguin_currency } = req.body as any

  const updates: Record<string, string | undefined> = {
    [PROVIDER_KEYS.codeswholesale]: codeswholesale_currency,
    [PROVIDER_KEYS.kinguin]: kinguin_currency,
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!value) continue

    await storeSettings.setSetting(key, (value as string).toLowerCase(), {
      category: 'currency',
      description: `Preferred currency for ${key.includes('kinguin') ? 'Kinguin' : 'CodesWholesale'} imports`,
    })
  }

  res.json({
    message: 'Provider currency settings updated',
    codeswholesale_currency: await storeSettings.getSettingValue(
      PROVIDER_KEYS.codeswholesale,
      PROVIDER_DEFAULTS.codeswholesale
    ),
    kinguin_currency: await storeSettings.getSettingValue(
      PROVIDER_KEYS.kinguin,
      PROVIDER_DEFAULTS.kinguin
    ),
  })
}

