import { convertCurrencyAmount } from './currency'

/**
 * Get a variant's price in the target currency.
 */
export function getVariantPriceInCurrency(
  variant: any,
  targetCurrency: string,
  currencyRates: Record<string, number>
): number {
  if (!variant || !targetCurrency) {
    return 0
  }

  const normalizedCurrency = targetCurrency.toLowerCase()
  const directPrice = variant.prices?.find((price: any) => price.currency_code?.toLowerCase() === normalizedCurrency)

  if (directPrice) {
    return directPrice.amount
  }

  if (!variant.prices || variant.prices.length === 0) {
    return 0
  }

  const fallbackPrice = variant.prices[0]
  return convertCurrencyAmount(
    fallbackPrice.amount,
    fallbackPrice.currency_code || 'usd',
    normalizedCurrency,
    currencyRates
  )
}

export function applyTax(amountInMinor: number, taxRate: number): number {
  if (!taxRate || taxRate <= 0) {
    return Math.round(amountInMinor)
  }

  return Math.round(amountInMinor * (1 + taxRate / 100))
}

export function calculateTaxAmount(amountInMinor: number, taxRate: number): number {
  if (!taxRate || taxRate <= 0) {
    return 0
  }

  return Math.round(amountInMinor * (taxRate / 100))
}

export function buildDisplayPrice(
  product: any,
  targetCurrency: string,
  currencyRates: Record<string, number>,
  taxRate: number
) {
  const firstVariant = product.variants?.[0]
  const baseAmount = getVariantPriceInCurrency(firstVariant, targetCurrency, currencyRates)
  const amountWithTax = applyTax(baseAmount, taxRate)

  return {
    currency_code: targetCurrency,
    amount: baseAmount,
    amount_with_tax: amountWithTax,
    tax_rate: taxRate,
  }
}

