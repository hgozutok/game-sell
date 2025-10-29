import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Get currency rates from settings
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeSettings = req.scope.resolve('storeSettings') as any

    const currencyRatesSetting = await storeSettings.getSetting('currency_rates')

    if (currencyRatesSetting) {
      res.json({
        key: 'currency_rates',
        value: currencyRatesSetting.value,
      })
    } else {
      // Return default rates if not configured
      const defaultRates = [
        { code: 'usd', symbol: '$', name: 'US Dollar', rate: 1.00 },
        { code: 'eur', symbol: '€', name: 'Euro', rate: 0.92 },
        { code: 'gbp', symbol: '£', name: 'British Pound', rate: 0.79 },
        { code: 'try', symbol: '₺', name: 'Turkish Lira', rate: 34.50 },
      ]

      res.json({
        key: 'currency_rates',
        value: JSON.stringify(defaultRates),
      })
    }
  } catch (error: any) {
    console.error('Currency rates GET error:', error)
    
    const defaultRates = [
      { code: 'usd', symbol: '$', name: 'US Dollar', rate: 1.00 },
      { code: 'eur', symbol: '€', name: 'Euro', rate: 0.92 },
      { code: 'gbp', symbol: '£', name: 'British Pound', rate: 0.79 },
      { code: 'try', symbol: '₺', name: 'Turkish Lira', rate: 34.50 },
    ]

    res.json({
      key: 'currency_rates',
      value: JSON.stringify(defaultRates),
    })
  }
}

