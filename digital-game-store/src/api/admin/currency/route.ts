import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

// Disable authentication for development
export const AUTHENTICATE = false

/**
 * List and manage enabled currencies
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettingsModule = req.scope.resolve('storeSettings') as any

  const enabledCurrencies = await storeSettingsModule.getSettingValue('currencies.enabled', ['USD', 'EUR', 'GBP'])
  const defaultCurrency = await storeSettingsModule.getSettingValue('currencies.default', 'USD')

  res.json({
    enabled_currencies: enabledCurrencies,
    default_currency: defaultCurrency,
    available_currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK'],
  })
}

/**
 * Update currency settings
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettingsModule = req.scope.resolve('storeSettings') as any
  const { enabled_currencies, default_currency } = req.body as any

  if (enabled_currencies && Array.isArray(enabled_currencies)) {
    await storeSettingsModule.setSetting('currencies.enabled', enabled_currencies, {
      category: 'general',
      description: 'List of enabled currencies for the store',
    })
  }

  if (default_currency && typeof default_currency === 'string') {
    await storeSettingsModule.setSetting('currencies.default', default_currency, {
      category: 'general',
      description: 'Default currency for the store',
    })
  }

  res.json({
    message: 'Currency settings updated successfully',
    enabled_currencies: enabled_currencies || (await storeSettingsModule.getSettingValue('currencies.enabled')),
    default_currency: default_currency || (await storeSettingsModule.getSettingValue('currencies.default')),
  })
}
