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
  { code: 'usd', name: 'US Dollar', symbol: '$', rate: 1.0 },
  { code: 'eur', name: 'Euro', symbol: '€', rate: 0.92 },
  { code: 'gbp', name: 'British Pound', symbol: '£', rate: 0.79 },
  { code: 'try', name: 'Turkish Lira', symbol: '₺', rate: 34.5 },
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
        ratesObj[r.code.toLowerCase()] = r.rate
      })
      
      return ratesObj
    }
  } catch (error) {
    // Fallback to defaults if settings not found
  }

  // Return default rates
  return {
    usd: 1.0,
    eur: 0.92,
    gbp: 0.79,
    try: 34.5,
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

/**
 * Convert an amount between two currencies using USD as the base rate.
 * @param amountInMinor - Amount in minor units (e.g., cents)
 * @param fromCurrency - Currency code of the amount
 * @param toCurrency - Target currency code
 * @param currencyRates - Record of currency -> rate (value of 1 USD in that currency)
 */
export function convertCurrencyAmount(
  amountInMinor: number,
  fromCurrency: string,
  toCurrency: string,
  currencyRates: Record<string, number>
): number {
  if (!amountInMinor || amountInMinor === 0 || !fromCurrency || !toCurrency) {
    return 0
  }

  const normalizedFrom = fromCurrency.toLowerCase()
  const normalizedTo = toCurrency.toLowerCase()

  if (normalizedFrom === normalizedTo) {
    return Math.round(amountInMinor)
  }

  const rates = currencyRates || {}
  const fromRate = normalizedFrom === 'usd' ? 1 : rates[normalizedFrom]
  const toRate = normalizedTo === 'usd' ? 1 : rates[normalizedTo]

  if (!fromRate || fromRate <= 0) {
    throw new Error(`Missing or invalid rate for currency: ${normalizedFrom}`)
  }

  if (!toRate || toRate <= 0) {
    throw new Error(`Missing or invalid rate for currency: ${normalizedTo}`)
  }

  // Convert to USD first, then to the target currency
  const amountInUsdMinor = normalizedFrom === 'usd'
    ? amountInMinor
    : amountInMinor / fromRate

  const convertedAmount = normalizedTo === 'usd'
    ? amountInUsdMinor
    : amountInUsdMinor * toRate

  return Math.round(convertedAmount)
}

