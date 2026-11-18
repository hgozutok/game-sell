'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { formatMoney, convertAmount } from '@/utils/currency'
import { getCartLimitEur } from '@/lib/cart-limit'
import { useT } from '@/components/useT'
import { useTranslation } from '@/i18n/LocaleProvider'
import StripePaymentModal from '@/components/StripePaymentModal'

const createCheckoutSchema = (t: (key: string) => string) =>
  z.object({
    email: z.string().email(t('checkout.validation.email')),
    firstName: z.string().min(2, t('checkout.validation.firstName')),
    lastName: z.string().min(2, t('checkout.validation.lastName')),
    address: z.string().min(5, t('checkout.validation.address')),
    city: z.string().min(2, t('checkout.validation.city')),
    postalCode: z.string().min(3, t('checkout.validation.postalCode')),
    country: z.string().min(2, t('checkout.validation.country')),
    paymentMethod: z.enum(['stripe', 'paypal', 'mollie', 'bank-transfer', 'bank_transfer'], {
      error: t('checkout.validation.paymentMethod'),
    }),
  })

type CheckoutFormData = z.infer<ReturnType<typeof createCheckoutSchema>>

const COUNTRY_CODES = ['GB', 'US', 'CA', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AU']

export default function CheckoutPage() {
  const t = useT()
  const { intlLocale, locale } = useTranslation()
  const checkoutSchema = useMemo(() => createCheckoutSchema(t), [t])
  const regionNames = useMemo(() => new Intl.DisplayNames([intlLocale], { type: 'region' }), [intlLocale])
  const router = useRouter()
  const { items, getTotalPrice, clearCart, hydrateFromServer } = useCartStore()
  const { selectedCurrency, currencies } = useCurrencyStore()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'info' | 'payment'>('info')
  const [stripeSecret, setStripeSecret] = useState<string | null>(null)
  const [stripeCartId, setStripeCartId] = useState<string | null>(null)
  const [availableMethods, setAvailableMethods] = useState<Array<{id: string, name: string}>>([])
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [methodsLoaded, setMethodsLoaded] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('us')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(20)
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false)
  const [previewTotals, setPreviewTotals] = useState<{
    subtotal: number
    tax_total: number
    total: number
    tax_rate: number
    currency_code: string
    payment_fee?: {
      provider: string
      amount_minor: number
      percent?: number
      fixed_minor?: number
      fixed_currency?: string
    } | null
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

  // Sunucu sepetiyle senkronize et (adet/fiyat backend'den doğrulanır)
  useEffect(() => {
    void hydrateFromServer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load default tax rate from public settings for fallback cases
  useEffect(() => {
    const loadDefaultTax = async () => {
      try {
        const res = await api.get('/store/settings')
        const rate = res.data?.taxes?.rate
        if (typeof rate === 'number' && isFinite(rate)) {
          setDefaultTaxRate(rate)
        }
      } catch {
        // ignore
      }
    }
    loadDefaultTax()
  }, [])

  // Load available payment methods from backend
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const response = await api.get('/store/payment-methods')
        const methods = response.data.methods || []
        setAvailableMethods(methods)
        setStripePublishableKey(response.data.stripe_publishable_key || '')
        
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
        payment_fee: null,
      })
      return
    }

    const fetchPreview = async () => {
      try {
        setPreviewLoading(true)
        // Fiyat sunucuda cozumlenir — istemci price/currency gönderilmez.
        // payment_method ile ödeme komisyonu da dahil edilir.
        const response = await api.post('/store/cart/preview', {
          items: items.map((item) => ({
            variant_id: item.variantId,
            quantity: item.quantity,
          })),
          currency_code: selectedCurrency.code,
          country_code: selectedCountry,
          payment_method: paymentMethod,
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
          payment_fee: shouldFallback ? null : response.data.payment_fee || null,
        })
      } catch (error) {
        // Fallback to local calc (20%)
        const fallbackSubtotal = computeLocalSubtotal(selectedCurrency.code)
        setPreviewTotals({
          subtotal: fallbackSubtotal,
          tax_total: Math.round(fallbackSubtotal * (defaultTaxRate / 100)),
          total: fallbackSubtotal + Math.round(fallbackSubtotal * (defaultTaxRate / 100)),
          tax_rate: defaultTaxRate,
          currency_code: selectedCurrency.code,
          payment_fee: null,
        })
      } finally {
        setPreviewLoading(false)
      }
    }

    fetchPreview()
  }, [items, selectedCountry, selectedCurrency.code, currencies, defaultTaxRate, paymentMethod])

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
        payment_method: data.paymentMethod.replace(/_/g, '-'),
        locale,
      }

      console.log('Creating order with data:', orderData)
      const response = await api.post('/store/orders/create', orderData)

      // Stripe: kart onayi gerekiyor — modal acilir, siparis onay sonrasi tamamlanir
      if (response.data.requires_action && response.data.payment?.client_secret) {
        setStripeSecret(response.data.payment.client_secret)
        setStripeCartId(response.data.cart_id)
        setLoading(false)
        return
      }

      if (response.data.order) {
        const orderId = response.data.order.id
        
        // Clear cart
        clearCart()

        // Basari sayfasina referans/siparis no tasi: misafir kullanicida
        // /store/orders/:id kimlik dogrulamasi istedigi icin bilgiler URL'den gelir.
        const successParams = new URLSearchParams()
        successParams.set('order_id', orderId)
        successParams.set('method', data.paymentMethod)
        const ref = response.data?.payment?.reference
        if (ref) successParams.set('ref', String(ref))
        const displayId = response.data?.order?.display_id
        if (displayId) successParams.set('no', String(displayId))
        const orderTotal = response.data?.order?.total
        if (orderTotal !== undefined && orderTotal !== null) {
          successParams.set('total', String(orderTotal))
        }
        if (response.data?.order?.currency_code) {
          successParams.set('cc', String(response.data.order.currency_code))
        }

        // Redirect to success page
        router.push(`/checkout/success?${successParams.toString()}`)

        toast.success(t('checkout.orderPlaced'), {
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
      toast.error(error.response?.data?.message || t('checkout.orderFailed'), {
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
  // Sepet ust limiti: admin panelde tanimliysa asimda checkout kilitlenir
  const cartLimitEur = getCartLimitEur()
  const limitDisplayMinor =
    cartLimitEur > 0
      ? convertAmount(cartLimitEur * 100, 'eur', currencyForDisplay, currencies || [])
      : 0
  const overLimit =
    cartLimitEur > 0 && previewTotals.total > 0 && previewTotals.total > limitDisplayMinor
  const formattedSubtotal = formatMoney(previewTotals.subtotal, currencyForDisplay)
  const formattedTax = formatMoney(previewTotals.tax_total, currencyForDisplay)
  const formattedTotal = formatMoney(previewTotals.total, currencyForDisplay)

  // Komisyon kurali: "%3 + £0.30" gibi admin panelde tanimli oran
  const paymentFee = previewTotals.payment_fee
  const paymentFeeRule = paymentFee
    ? [
        paymentFee.percent ? `%${paymentFee.percent}` : null,
        paymentFee.fixed_minor
          ? formatMoney(paymentFee.fixed_minor, paymentFee.fixed_currency || currencyForDisplay)
          : null,
      ]
        .filter(Boolean)
        .join(' + ')
    : ''
  const paymentFeeLabel = paymentFee
    ? `${paymentFee.provider}${paymentFeeRule ? ` · ${paymentFeeRule}` : ''}`
    : ''

  if (items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">

      {stripeSecret && stripeCartId && (
        <StripePaymentModal
          clientSecret={stripeSecret}
          cartId={stripeCartId}
          amountLabel={formattedTotal}
          publishableKey={stripePublishableKey}
          onSuccess={(order) => {
            setStripeSecret(null)
            setStripeCartId(null)
            clearCart()
            router.push(`/checkout/success?order_id=${order?.id || ''}&method=stripe`)
          }}
          onClose={() => {
            setStripeSecret(null)
            setStripeCartId(null)
          }}
        />
      )}

      {/* Header */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-[#ff6b35] transition">
              {t('common.home')}
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/cart" className="text-gray-400 hover:text-[#ff6b35] transition">
              {t('nav.cart')}
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold">{t('checkout.title')}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        {/* Progress Steps */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-10 px-2">
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <div className="flex items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm md:text-base flex-shrink-0 ${
                  step === 'info'
                    ? 'bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white'
                    : 'bg-green-500 text-white'
                }`}
              >
                {step === 'payment' ? '✓' : '1'}
              </div>
              <span className="ms-2 sm:ms-3 text-xs sm:text-sm md:text-base font-semibold text-white whitespace-nowrap">
                {t('checkout.stepBilling')}
              </span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 sm:h-1 bg-gray-700 flex-shrink-0"></div>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm md:text-base flex-shrink-0 ${
                  step === 'payment'
                    ? 'bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                2
              </div>
              <span
                className={`ms-2 sm:ms-3 text-xs sm:text-sm md:text-base font-semibold whitespace-nowrap ${
                  step === 'payment' ? 'text-white' : 'text-gray-500'
                }`}
              >
                {t('checkout.stepPayment')}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Order Summary Accordion (lg:hidden) */}
        <div className="lg:hidden gaming-card p-3.5 sm:p-4 mb-6">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base sm:text-lg flex-shrink-0">🛒</span>
              <span className="font-bold text-white text-xs sm:text-sm truncate">{t('checkout.orderSummary')}</span>
              <span className="text-[11px] text-gray-400 font-medium">({items.length})</span>
              <span className="text-[#ff6b35] text-[11px] font-bold">
                {mobileSummaryOpen ? '▲' : '▼'}
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-[#ff6b35] whitespace-nowrap ms-2">
              {previewLoading ? t('cart.calculating') : formattedTotal}
            </div>
          </button>

          {mobileSummaryOpen && (
            <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-2.5 items-center">
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-lg">🎮</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-xs truncate">{item.title}</div>
                      <div className="text-gray-400 text-[11px]">{t('checkout.qty', { count: item.quantity })}</div>
                    </div>
                    <div className="text-[#ff6b35] font-bold text-xs whitespace-nowrap">
                      {selectedCurrency.symbol}{((item.price * item.quantity) / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-800 pt-2.5 space-y-1 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>{t('checkout.subtotal')}</span>
                  <span className="text-white">{previewLoading ? t('cart.calculating') : formattedSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('checkout.vat')}{previewTotals.tax_rate ? ` (${previewTotals.tax_rate.toFixed(2)}%)` : ''}:</span>
                  <span className="text-white">{previewLoading ? t('cart.calculating') : formattedTax}</span>
                </div>
                {paymentFee && (
                  <div className="flex justify-between">
                    <span>{t('checkout.paymentFee', { provider: paymentFeeLabel })}</span>
                    <span className="text-white">
                      {previewLoading
                        ? t('cart.calculating')
                        : formatMoney(paymentFee.amount_minor, currencyForDisplay)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-800 pt-2 flex justify-between text-white font-bold text-sm">
                  <span>{t('checkout.total')}</span>
                  <span className="text-[#ff6b35] font-black">{previewLoading ? t('cart.calculating') : formattedTotal}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Billing Information */}
              <div className="gaming-card p-4 sm:p-6 md:p-8">
                <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">{t('checkout.billingInfo')}</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white text-xs sm:text-sm font-semibold mb-1.5">{t('checkout.email')} *</label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full bg-[#1a1d24] border border-gray-700 text-white text-base px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                      placeholder="your.email@example.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.email.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-white text-xs sm:text-sm font-semibold mb-1.5">{t('checkout.firstName')} *</label>
                      <input
                        type="text"
                        {...register('firstName')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white text-base px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="John"
                      />
                      {errors.firstName && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="block text-white text-xs sm:text-sm font-semibold mb-1.5">{t('checkout.lastName')} *</label>
                      <input
                        type="text"
                        {...register('lastName')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white text-base px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="Doe"
                      />
                      {errors.lastName && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-white text-xs sm:text-sm font-semibold mb-1.5">{t('checkout.address')} *</label>
                    <input
                      type="text"
                      {...register('address')}
                      className="w-full bg-[#1a1d24] border border-gray-700 text-white text-base px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                      placeholder="123 Main Street"
                    />
                    {errors.address && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.address.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-white text-xs sm:text-sm font-semibold mb-1.5">{t('checkout.city')} *</label>
                      <input
                        type="text"
                        {...register('city')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white text-base px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="London"
                      />
                      {errors.city && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="block text-white text-xs sm:text-sm font-semibold mb-1.5">{t('checkout.postalCode')} *</label>
                      <input
                        type="text"
                        {...register('postalCode')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white text-base px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="SW1A 1AA"
                      />
                      {errors.postalCode && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.postalCode.message}</p>}
                    </div>
                    <div>
                      <label className="block text-white text-xs sm:text-sm font-semibold mb-1.5">{t('checkout.country')} *</label>
                      <select
                        {...register('country')}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white text-base px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                      >
                        <option value="">{t('checkout.select')}</option>
                        {COUNTRY_CODES.map((code) => (
                          <option key={code} value={code}>
                            {regionNames.of(code) || code}
                          </option>
                        ))}
                      </select>
                      {errors.country && <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.country.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="gaming-card p-4 sm:p-6 md:p-8">
                <h2 className="text-xl sm:text-2xl font-black text-white mb-4 sm:mb-6">💳 {t('checkout.paymentMethod')}</h2>

                {!methodsLoaded ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#ff6b35]"></div>
                  </div>
                ) : availableMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">{t('checkout.noMethods')}</p>
                    <p className="text-xs text-gray-500 mt-2">{t('checkout.noMethodsHint')}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3">
                    {availableMethods.map((method) => {
                      const methodId = method.id.replace('_', '-')
                      const icons: Record<string, string> = {
                        paypal: '🅿️',
                        mollie: '🇪🇺',
                        stripe: '💳',
                        'bank-transfer': '🏦',
                        bank_transfer: '🏦',
                      }
                      const descriptions: Record<string, string> = {
                        paypal: t('checkout.pay.paypal'),
                        mollie: t('checkout.pay.mollie'),
                        stripe: t('checkout.pay.stripe'),
                        'bank-transfer': t('checkout.pay.bankTransfer'),
                        bank_transfer: t('checkout.pay.bankTransfer'),
                      }

                      return (
                        <label
                          key={method.id}
                          className="flex items-center gap-3 sm:gap-4 bg-[#1a1d24] border-2 border-gray-700 rounded-lg p-3 sm:p-4 cursor-pointer hover:border-[#ff6b35] transition"
                        >
                          <input
                            type="radio"
                            value={methodId}
                            {...register('paymentMethod')}
                            className="w-5 h-5 text-[#ff6b35] flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-sm sm:text-base">{method.name}</div>
                            <div className="text-xs sm:text-sm text-gray-400 line-clamp-2">{descriptions[method.id]}</div>
                          </div>
                          <span className="text-xl sm:text-2xl flex-shrink-0">{icons[method.id] || '💳'}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {errors.paymentMethod && <p className="text-red-500 text-xs sm:text-sm mt-2">{errors.paymentMethod.message}</p>}
              </div>

              {/* Submit Button */}
              {overLimit && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm mb-4">
                  ⚠️ Sepet toplamı mağaza üst limitini ({formatMoney(limitDisplayMinor, currencyForDisplay)})
                  aşıyor. Lütfen sepetinizi azaltın.
                </div>
              )}
              <button
                type="submit"
                disabled={loading || overLimit}
                className="w-full btn-primary text-base sm:text-lg py-3.5 sm:py-4 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('checkout.processing') : `${t('checkout.placeOrder')} · ${formattedTotal}`}
              </button>

              <p className="text-center text-xs sm:text-sm text-gray-500 px-2">
                {t('checkout.agreePrefix')}{' '}
                <Link href="/terms" className="text-[#ff6b35] hover:underline">
                  {t('footer.terms')}
                </Link>{' '}
                {t('checkout.agreeAnd')}{' '}
                <Link href="/privacy" className="text-[#ff6b35] hover:underline">
                  {t('footer.privacy')}
                </Link>
              </p>
            </form>
          </div>

          {/* Order Summary (Desktop Sticky Sidebar) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="gaming-card p-6 sticky top-4">
              <h3 className="text-xl font-black text-white mb-4">{t('checkout.orderSummary')}</h3>

              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
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
                      <div className="text-gray-400 text-xs">{t('checkout.qty', { count: item.quantity })}</div>
                      <div className="text-[#ff6b35] font-bold text-sm">
                        {selectedCurrency.symbol}{((item.price * item.quantity) / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>{t('checkout.subtotal')}</span>
                  <span>{previewLoading ? t('cart.calculating') : formattedSubtotal}</span>
                </div>
                <div className="flex justify-between text-gray-400 text-sm">
                  <span>{t('checkout.vat')}{previewTotals.tax_rate ? ` (${previewTotals.tax_rate.toFixed(2)}%)` : ''}:</span>
                  <span>{previewLoading ? t('cart.calculating') : formattedTax}</span>
                </div>
                {paymentFee && (
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>{t('checkout.paymentFee', { provider: paymentFeeLabel })}</span>
                    <span>
                      {previewLoading
                        ? t('cart.calculating')
                        : formatMoney(paymentFee.amount_minor, currencyForDisplay)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-2 flex justify-between text-white font-bold text-lg sm:text-xl">
                  <span>{t('checkout.total')}</span>
                  <span className="text-[#ff6b35]">{previewLoading ? t('cart.calculating') : formattedTotal}</span>
                </div>
              </div>

              <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-500 font-semibold mb-2">
                  <span>✓</span>
                  <span>{t('checkout.instantDelivery')}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-400">{t('checkout.deliveryNote')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
