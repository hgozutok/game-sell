"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCartStore } from "@/store/cartStore"
import { useCurrencyStore } from "@/store/currencyStore"
import { useTaxSettingsStore } from "@/store/taxSettingsStore"
import { api } from "@/lib/api"
import { formatMoney, getCurrencySymbol, convertAmount } from "@/utils/currency"

export default function CartPage() {
  const router = useRouter()
  const { items, removeItem, updateQuantity } = useCartStore()
  const { selectedCurrency, currencies } = useCurrencyStore()
  const { countryName: adminCountryName, vatRate: adminVatRate } = useTaxSettingsStore()
  const [selectedCountry, setSelectedCountry] = useState('us')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewTotals, setPreviewTotals] = useState<{
    subtotal: number
    tax_total: number
    total: number
    tax_rate: number
    currency_code: string
  }>({
    subtotal: 0,
    tax_total: 0,
    total: 0,
    tax_rate: 0,
    currency_code: selectedCurrency.code,
  })
  const countries = [
    { code: 'us', label: 'United States' },
    { code: 'gb', label: 'United Kingdom' },
    { code: 'de', label: 'Germany' },
    { code: 'fr', label: 'France' },
    { code: 'tr', label: 'Turkey' },
    { code: 'eu', label: 'European Union' },
  ]

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

  const labelByCode: Record<string, string> = {
    us: 'United States',
    gb: 'United Kingdom',
    de: 'Germany',
    fr: 'France',
    tr: 'Turkey',
    eu: 'European Union',
  }
  
  const isEmpty = items.length === 0

  const currencyCodeForDisplay = previewTotals.currency_code || selectedCurrency.code

  const convertForCurrency = (amount: number, fromCurrency: string | undefined, targetCurrency: string) => {
    if (!fromCurrency || !targetCurrency || fromCurrency.toLowerCase() === targetCurrency.toLowerCase()) {
      return amount
    }
    return convertAmount(amount, fromCurrency, targetCurrency, currencies || [])
  }

  const formatPrice = (amount: number, currencyCode?: string) => {
    return formatMoney(amount, currencyCode || currencyCodeForDisplay)
  }

  const computeLocalSubtotal = (targetCurrency: string) => {
    return items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity
      return sum + convertForCurrency(itemTotal, item.currency, targetCurrency)
    }, 0)
  }

  useEffect(() => {
    if (!items.length) {
      setPreviewTotals({
        subtotal: 0,
        tax_total: 0,
        total: 0,
        tax_rate: 0,
        currency_code: selectedCurrency.code,
      })
      return
    }

    const fetchPreview = async () => {
      try {
        setPreviewLoading(true)
        const response = await api.post('/store/cart/preview', {
          items: items.map((item) => ({
            variant_id: item.variantId,
            quantity: item.quantity,
          })),
          country_code: selectedCountry,
        })

        const responseCurrency = response.data.currency_code || selectedCurrency.code
        const fallbackSubtotal = computeLocalSubtotal(responseCurrency)
        const shouldFallback = response.data.subtotal === 0 && items.length > 0
        const effectiveSubtotal = shouldFallback ? fallbackSubtotal : response.data.subtotal

        // Determine tax rate:
        // 1) If admin override is set and country label matches, use it
        // 2) Else use server response
        // 3) Else fallback to local static rates
        const selectedLabel = labelByCode[selectedCountry]
        const adminApplies =
          adminCountryName &&
          selectedLabel &&
          adminCountryName.trim().toLowerCase() === selectedLabel.toLowerCase()

        const serverTaxRate = response.data.tax_rate
        const fallbackTaxRate =
          (adminApplies ? adminVatRate : undefined) ??
          (serverTaxRate !== undefined ? serverTaxRate : COUNTRY_TAX_RATES[selectedCountry] ?? 0)

        const effectiveTaxRate = shouldFallback ? fallbackTaxRate : (adminApplies ? adminVatRate : serverTaxRate)
        const fallbackTaxTotal = Math.round(effectiveSubtotal * (fallbackTaxRate / 100))
        const effectiveTaxTotal = shouldFallback ? fallbackTaxTotal : response.data.tax_total
        const effectiveTotal = shouldFallback ? effectiveSubtotal + effectiveTaxTotal : response.data.total

        setPreviewTotals({
          subtotal: effectiveSubtotal,
          tax_total: effectiveTaxTotal,
          total: effectiveTotal,
          tax_rate: effectiveTaxRate,
          currency_code: responseCurrency,
        })
      } catch (error) {
        console.error('Cart preview error:', error)
        const fallbackSubtotal = computeLocalSubtotal(selectedCurrency.code)
        setPreviewTotals({
          subtotal: fallbackSubtotal,
          tax_total: Math.round(fallbackSubtotal * (((adminCountryName && labelByCode[selectedCountry] && adminCountryName.trim().toLowerCase() === labelByCode[selectedCountry].toLowerCase()) ? adminVatRate : (COUNTRY_TAX_RATES[selectedCountry] ?? 0)) / 100)),
          total: fallbackSubtotal + Math.round(fallbackSubtotal * (((adminCountryName && labelByCode[selectedCountry] && adminCountryName.trim().toLowerCase() === labelByCode[selectedCountry].toLowerCase()) ? adminVatRate : (COUNTRY_TAX_RATES[selectedCountry] ?? 0)) / 100)),
          tax_rate: (adminCountryName && labelByCode[selectedCountry] && adminCountryName.trim().toLowerCase() === labelByCode[selectedCountry].toLowerCase()) ? adminVatRate : (COUNTRY_TAX_RATES[selectedCountry] ?? 0),
          currency_code: selectedCurrency.code,
        })
      } finally {
        setPreviewLoading(false)
      }
    }

    fetchPreview()
  }, [items, selectedCountry, selectedCurrency.code, currencies, adminCountryName, adminVatRate])

  const handleCheckout = () => {
    router.push('/checkout')
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-[#0a0b0d]">
        <div className="bg-[#15171c] border-b border-gray-800">
          <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
              SHOPPING CART
            </h1>
            <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e]"></div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="gaming-card p-12 text-center">
              <div className="w-32 h-32 bg-gradient-to-br from-[#ff6b35]/20 to-[#f7931e]/20 rounded-full flex items-center justify-center text-7xl mx-auto mb-6">
                🛒
              </div>
              <h2 className="text-3xl font-black text-white mb-4">YOUR CART IS EMPTY</h2>
              <p className="text-gray-400 mb-8 text-lg">
                Start shopping and add some amazing games to your cart!
              </p>
              <Link href="/products" className="btn-primary inline-block">
                BROWSE GAMES
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-gray-100">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
                SHOPPING CART
              </h1>
              <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e]"></div>
            </div>
            <p className="text-xl text-gray-400">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.variantId} className="gaming-card p-6">
                <div className="flex gap-6">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.thumbnail || "/placeholder-game.jpg"}
                      alt={item.title}
                      className="w-32 h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder-game.jpg"
                      }}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Link
                          href={`/products/${item.handle || item.productId}`}
                          className="text-xl font-bold text-white hover:text-[#ff6b35] transition-colors"
                        >
                          {item.title}
                        </Link>
                        <div className="flex gap-2 mt-2">
                          {item.metadata?.platform && (
                            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded-full">
                              {item.metadata.platform}
                            </span>
                          )}
                          {item.metadata?.region && (
                            <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded-full">
                              {item.metadata.region}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove from cart"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4">
                        <label className="text-gray-400 font-semibold">Quantity:</label>
                        <div className="flex items-center border border-gray-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="px-4 py-2 bg-[#1a1d24] hover:bg-[#202329] transition-colors"
                          >
                            -
                          </button>
                          <span className="px-6 py-2 bg-[#15171c]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            className="px-4 py-2 bg-[#1a1d24] hover:bg-[#202329] transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                      <div className="text-2xl font-bold text-[#ff6b35]">
                        {formatPrice(
                          convertForCurrency(item.price * item.quantity, item.currency, currencyCodeForDisplay),
                          currencyCodeForDisplay
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatPrice(
                          convertForCurrency(item.price, item.currency, currencyCodeForDisplay),
                          currencyCodeForDisplay
                        )} each
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="gaming-card p-8 sticky top-8">
              <h2 className="text-2xl font-bold text-white mb-6">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Select Country for Tax Calculation</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded-lg text-white focus:border-[#ff6b35] focus:outline-none"
                  >
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Tax rate adjusts automatically based on your country selection.
                  </p>
                </div>

                <div className="flex justify-between text-lg">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white font-semibold">
                    {previewLoading ? 'Calculating...' : formatPrice(previewTotals.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-400">Tax</span>
                  <span className="text-white font-semibold">
                    {previewLoading ? 'Calculating...' : formatPrice(previewTotals.tax_total)}
                  </span>
                </div>
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex justify-between text-2xl font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-[#ff6b35]">
                      {previewLoading ? 'Calculating...' : formatPrice(previewTotals.total)}
                    </span>
                  </div>
                  {!previewLoading && (
                    <p className="text-xs text-gray-500 mt-2">
                      Tax rate applied: {previewTotals.tax_rate.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full btn-primary mb-4 py-4"
              >
                Proceed to Checkout
              </button>

              <Link
                href="/products"
                className="block text-center text-[#ff6b35] hover:text-[#ff7b45] font-semibold"
              >
                Continue Shopping
              </Link>

              <div className="mt-8 pt-8 border-t border-gray-800">
                <h3 className="font-bold text-white mb-3">Secure Checkout</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>SSL Encrypted Payment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Instant Digital Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>24/7 Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
