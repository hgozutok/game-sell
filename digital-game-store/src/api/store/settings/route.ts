import type { MedusaRequest, MedusaResponse} from '@medusajs/framework/http'

/**
 * Get public store settings (theme, currencies, etc.)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeSettingsModule = req.scope.resolve('storeSettings') as any

    const themeSettings = await storeSettingsModule.getThemeSettings()
    const enabledCurrencies = await storeSettingsModule.getSettingValue('currencies.enabled', ['USD', 'EUR', 'GBP'])
    const defaultCurrency = await storeSettingsModule.getSettingValue('currencies.default', 'USD')
    const displayCurrency = await storeSettingsModule.getSettingValue('store.display_currency', defaultCurrency)
    const taxRate = await storeSettingsModule.getSettingValue('tax.rate', 20)
    const storeName = await storeSettingsModule.getSettingValue('store.name', 'Digital Game Store')
    const storeDescription = await storeSettingsModule.getSettingValue(
      'store.description',
      'Your trusted marketplace for digital game keys'
    )

    res.json({
      theme: themeSettings,
      currencies: {
        enabled: enabledCurrencies,
        default: defaultCurrency,
        display: displayCurrency,
      },
      store: {
        name: storeName,
        description: storeDescription,
      },
      taxes: {
        rate: typeof taxRate === 'number' ? taxRate : parseFloat(taxRate) || 0,
      },
    })
  } catch (error: any) {
    console.error('Settings GET error:', error)
    // Return default settings if error
    res.json({
      theme: {
        headerBgColor: '#15171c',
        primaryColor: '#ff6b35',
        secondaryColor: '#f7931e',
      },
      currencies: {
        enabled: ['USD'],
        default: 'USD',
        display: 'USD',
      },
      store: {
        name: 'Digital Game Store',
        description: 'Your trusted marketplace for digital game keys',
      },
      taxes: {
        rate: 0,
      },
    })
  }
}
