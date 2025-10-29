/**
 * Currency utilities for multi-currency support
 */

export interface CurrencyRate {
  code: string
  name: string
  symbol: string
  rate: number
}

export const DEFAULT_CURRENCY_RATES: CurrencyRate[] = [
  { code: 'usd', name: 'US Dollar', symbol: '$', rate: 1.00 },
  { code: 'eur', name: 'Euro', symbol: '€', rate: 0.92 },
  { code: 'gbp', name: 'British Pound', symbol: '£', rate: 0.79 },
  { code: 'try', name: 'Turkish Lira', symbol: '₺', rate: 34.50 },
]

/**
 * Get currency rates from settings or use defaults
 */
export async function getCurrencyRates(settingsService: any): Promise<Record<string, number>> {
  try {
    const currencyRatesSetting = await settingsService.getSetting('currency_rates')
    
    if (currencyRatesSetting && currencyRatesSetting.value) {
      const rates = JSON.parse(currencyRatesSetting.value) as CurrencyRate[]
      
      // Convert to object format { usd: 1, eur: 0.92, ... }
      const ratesObj: Record<string, number> = {}
      rates.forEach((r: CurrencyRate) => {
        ratesObj[r.code] = r.rate
      })
      
      return ratesObj
    }
  } catch (error) {
    // Fallback to defaults if settings not found
  }

  // Return default rates
  return {
    usd: 1.00,
    eur: 0.92,
    gbp: 0.79,
    try: 34.50,
  }
}

/**
 * Calculate multi-currency prices from a base USD price
 */
export function calculateMultiCurrencyPrices(
  basePriceInCents: number,
  currencyRates: Record<string, number>
): Array<{ amount: number; currency_code: string; rules: {} }> {
  return Object.entries(currencyRates).map(([currency, rate]) => ({
    amount: Math.round(basePriceInCents * rate),
    currency_code: currency,
    rules: {},
  }))
}

