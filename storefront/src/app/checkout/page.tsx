'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast, { Toaster } from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatMoney, convertAmount } from '@/utils/currency'

const checkoutSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  paymentMethod: z.enum(['paypal', 'mollie', 'bank-transfer'], {
    required_error: 'Please select a payment method',
  }),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export default function CheckoutPage() {
  const router = useRouter()
  const { items, getTotalPrice, clearCart } = useCartStore()
  const { selectedCurrency, currencies } = useCurrencyStore()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'info' | 'payment'>('info')
  const [availableMethods, setAvailableMethods] = useState<Array<{id: string, name: string}>>([])
  const [methodsLoaded, setMethodsLoaded] = useState(false)
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: 'bank-transfer',
    },
  })

  const paymentMethod = watch('paymentMethod')
  const formCountry = watch('country')

  useEffect(() => {
    if (formCountry && typeof formCountry === 'string') {
      setSelectedCountry(formCountry.toLowerCase())
    }
  }, [formCountry])

  // Load available payment methods from backend
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const response = await api.get('/store/payment-methods')
        const methods = response.data.methods || []
        setAvailableMethods(methods)
        
        // Set first method as default if available
        if (methods.length > 0) {
          const firstMethod = methods[0].id.replace('_', '-')
          // Update form default
        }
      } catch (err) {
        console.error('Failed to load payment methods:', err)
        // Fallback to bank transfer
        setAvailableMethods([{ id: 'bank-transfer', name: 'Bank Transfer' }])
      } finally {
        setMethodsLoaded(true)
      }
    }

    loadPaymentMethods()
  }, [])

  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart')
    }
  }, [items, router])

  // Helpers for currency conversion in fallback mode
  const convertForCurrency = (amount: number, fromCurrency: string | undefined, targetCurrency: string) => {
    if (!fromCurrency || !targetCurrency || fromCurrency.toLowerCase() === targetCurrency.toLowerCase()) {
      return amount
    }
    return convertAmount(amount, fromCurrency, targetCurrency, currencies || [])
  }
  const computeLocalSubtotal = (targetCurrency: string) => {
    return items.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity
      return sum + convertForCurrency(itemTotal, item.currency, targetCurrency)
    }, 0)
  }

  // Fetch preview totals whenever items or country change
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
            price: item.price,
            currency: item.currency,
          })),
          currency_code: selectedCurrency.code,
          country_code: selectedCountry,
        })

        const responseCurrency = response.data.currency_code || selectedCurrency.code
        const fallbackSubtotal = computeLocalSubtotal(responseCurrency)
        const shouldFallback = response.data.subtotal === 0 && items.length > 0
        const effectiveSubtotal = shouldFallback ? fallbackSubtotal : response.data.subtotal

        const effectiveTaxRate = response.data.tax_rate ?? 0
        const fallbackTaxTotal = Math.round(effectiveSubtotal * (effectiveTaxRate / 100))
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
        // Fallback to local calc (20%)
        const fallbackSubtotal = computeLocalSubtotal(selectedCurrency.code)
        setPreviewTotals({
          subtotal: fallbackSubtotal,
          tax_total: Math.round(fallbackSubtotal * 0.2),
          total: fallbackSubtotal + Math.round(fallbackSubtotal * 0.2),
          tax_rate: 20,
          currency_code: selectedCurrency.code,
        })
      } finally {
        setPreviewLoading(false)
      }
    }

    fetchPreview()
  }, [items, selectedCountry, selectedCurrency.code, currencies])

  const onSubmit = async (data: CheckoutFormData) => {
    setLoading(true)

    try {
      // Create order in backend
      const orderData = {
        items: items.map((item) => ({
          variant_id: item.variantId,
          quantity: item.quantity,
        })),
        email: data.email,
        billing_address: {
          first_name: data.firstName,
          last_name: data.lastName,
          address_1: data.address,
          city: data.city,
          postal_code: data.postalCode,
          country_code: data.country,
        },
        shipping_address: {
          first_name: data.firstName,
          last_name: data.lastName,
          address_1: data.address,
          city: data.city,
          postal_code: data.postalCode,
          country_code: data.country,
        },
        payment_method: data.paymentMethod,
      }

      console.log('Creating order with data:', orderData)
      const response = await api.post('/store/orders/create', orderData)

      if (response.data.order) {
        const orderId = response.data.order.id
        
        // Clear cart
        clearCart()

        // Redirect to success page
        router.push(`/checkout/success?order_id=${orderId}`)

        toast.success('Order placed successfully!', {
          style: {
            background: '#15171c',
            color: '#fff',
            border: '1px solid #ff6b35',
          },
        })
      }
    } catch (error: any) {
      console.error('Checkout error:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      toast.error(error.response?.data?.message || 'Failed to process order. Please try again.', {
        style: {
          background: '#15171c',
          color: '#fff',
          border: '1px solid #ff6b35',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const totalPrice = getTotalPrice()
  const currencyForDisplay = previewTotals.currency_code || selectedCurrency.code
  const formattedSubtotal = formatMoney(previewTotals.subtotal, currencyForDisplay)
  const formattedTax = formatMoney(previewTotals.tax_total, currencyForDisplay)
  const formattedTotal = formatMoney(previewTotals.total, currencyForDisplay)

  if (items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-[#ff6b35] transition">
              Home
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/cart" className="text-gray-400 hover:text-[#ff6b35] transition">
              Cart
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold">Checkout</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step === 'info'
                    ? 'bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white'
                    : 'bg-green-500 text-white'
                }`}
              >
                {step === 'payment' ? '✓' : '1'}
              </div>
              <span className="ml-3 font-semibold text-white">Billing Info</span>
            </div>
            <div className="w-20 h-1 bg-gray-700"></div>
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step === 'payment'
                    ? 'bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                2
              </div>
              <span className={`ml-3 font-semibold ${step === 'payment' ? 'text-white' : 'text-gray-500'}`}>
                Payment
              </span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Billing Information */}
              <div className="gaming-card p-8">
                <h2 className="text-2xl font-black text-white mb-6">📋 BILLING INFORMATION</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">Email *</label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                      placeholder="your.email@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">First Name *</label>
                      <input
                        type="text"
                        {...register('firstName')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="John"
                      />
                      {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Last Name *</label>
                      <input
                        type="text"
                        {...register('lastName')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="Doe"
                      />
                      {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">Address *</label>
                    <input
                      type="text"
                      {...register('address')}
                      className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                      placeholder="123 Main Street"
                    />
                    {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">City *</label>
                      <input
                        type="text"
                        {...register('city')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="London"
                      />
                      {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Postal Code *</label>
                      <input
                        type="text"
                        {...register('postalCode')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="SW1A 1AA"
                      />
                      {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>}
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Country *</label>
                      <select
                        {...register('country')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                      >
                        <option value="">Select...</option>
                        <option value="GB">United Kingdom</option>
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="ES">Spain</option>
                        <option value="IT">Italy</option>
                        <option value="NL">Netherlands</option>
                        <option value="BE">Belgium</option>
                        <option value="AU">Australia</option>
                      </select>
                      {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="gaming-card p-8">
                <h2 className="text-2xl font-black text-white mb-6">💳 PAYMENT METHOD</h2>

                {!methodsLoaded ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff6b35]"></div>
                  </div>
                ) : availableMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Aktif ödeme yöntemi bulunamadı.</p>
                    <p className="text-sm text-gray-500 mt-2">Lütfen admin panelden ödeme sistemlerini yapılandırın.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableMethods.map((method) => {
                      const methodId = method.id.replace('_', '-')
                      const icons: Record<string, string> = {
                        paypal: '🅿️',
                        mollie: '🇪🇺',
                        'bank-transfer': '🏦',
                        bank_transfer: '🏦',
                      }
                      const descriptions: Record<string, string> = {
                        paypal: 'Pay with your PayPal account',
                        mollie: 'iDEAL, Bancontact, and more',
                        'bank-transfer': 'Manual bank transfer - requires approval',
                        bank_transfer: 'Manual bank transfer - requires approval',
                      }

                      return (
                        <label
                          key={method.id}
                          className="flex items-center gap-4 bg-[#1a1d24] border-2 border-gray-700 rounded-lg p-4 cursor-pointer hover:border-[#ff6b35] transition"
                        >
                          <input
                            type="radio"
                            value={methodId}
                            {...register('paymentMethod')}
                            className="w-5 h-5 text-[#ff6b35]"
                          />
                          <div className="flex-1">
                            <div className="font-bold text-white">{method.name}</div>
                            <div className="text-sm text-gray-400">{descriptions[method.id]}</div>
                          </div>
                          <span className="text-2xl">{icons[method.id] || '💳'}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {errors.paymentMethod && <p className="text-red-500 text-sm mt-2">{errors.paymentMethod.message}</p>}
              </div>

              {/* Submit Button */}
              <button type="submit" disabled={loading} className="w-full btn-primary text-lg py-4">
                {loading ? 'PROCESSING...' : `PLACE ORDER - ${formattedTotal}`}
              </button>

              <p className="text-center text-sm text-gray-500">
                By placing this order, you agree to our{' '}
                <Link href="/terms" className="text-[#ff6b35] hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-[#ff6b35] hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="gaming-card p-6 sticky top-4">
              <h3 className="text-xl font-black text-white mb-4">📦 ORDER SUMMARY</h3>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-2xl">🎮</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold text-sm truncate">{item.title}</div>
                      <div className="text-gray-400 text-xs">Qty: {item.quantity}</div>
                      <div className="text-[#ff6b35] font-bold text-sm">
                        {selectedCurrency.symbol}{((item.price * item.quantity) / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal:</span>
                  <span>{previewLoading ? 'Calculating...' : formattedSubtotal}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>VAT{previewTotals.tax_rate ? ` (${previewTotals.tax_rate.toFixed(2)}%)` : ''}:</span>
                  <span>{previewLoading ? 'Calculating...' : formattedTax}</span>
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between text-white font-bold text-xl">
                  <span>Total:</span>
                  <span>{previewLoading ? 'Calculating...' : formattedTotal}</span>
                </div>
              </div>

              <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-500 font-semibold mb-2">
                  <span>✓</span>
                  <span>Instant Delivery</span>
                </div>
                <p className="text-sm text-gray-400">Your keys will be delivered to your email immediately</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
