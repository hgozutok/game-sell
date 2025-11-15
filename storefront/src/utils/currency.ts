const SYMBOL_MAP: Record<string, string> = {
  usd: '$',
  eur: '€',
  gbp: '£',
  try: '₺',
  cad: 'CA$',
  aud: 'A$',
}

export function getCurrencySymbol(code?: string) {
  if (!code) return '$'
  const normalized = code.toLowerCase()
  return SYMBOL_MAP[normalized] || normalized.toUpperCase()
}

export function formatMoney(
  amountInMinor: number,
  currencyCode: string,
  options?: Intl.NumberFormatOptions
) {
  const code = currencyCode?.toUpperCase() || 'USD'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(amountInMinor / 100)
  } catch {
    return `${getCurrencySymbol(code)}${(amountInMinor / 100).toFixed(2)}`
  }
}

type CurrencyRate = {
  code: string
  rate: number
}

export function buildRateMap(rates: CurrencyRate[]): Record<string, number> {
  return rates.reduce((acc, rate) => {
    acc[rate.code.toLowerCase()] = rate.rate
    return acc
  }, {} as Record<string, number>)
}

export function convertAmount(
  amountInMinor: number,
  fromCurrency: string,
  toCurrency: string,
  rates: CurrencyRate[]
) {
  const normalizedFrom = fromCurrency?.toLowerCase()
  const normalizedTo = toCurrency?.toLowerCase()

  if (!amountInMinor || !normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
    return amountInMinor
  }

  const rateMap = buildRateMap(rates)
  const fromRate = normalizedFrom === 'usd' ? 1 : rateMap[normalizedFrom]
  const toRate = normalizedTo === 'usd' ? 1 : rateMap[normalizedTo]

  if (!fromRate || !toRate) {
    return amountInMinor
  }

  const amountInUsd = normalizedFrom === 'usd' ? amountInMinor : amountInMinor / fromRate
  const convertedAmount = normalizedTo === 'usd' ? amountInUsd : amountInUsd * toRate

  return Math.round(convertedAmount)
}

