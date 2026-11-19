'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useCartStore } from '@/store/cartStore'
import { useTranslation } from '@/i18n/LocaleProvider'

/**
 * /checkout/paypal-return
 *
 * PayPal kullaniciyi onayladiktan sonra bu sayfaya yonlendirir:
 *   https://hupiplay.uk/checkout/paypal-return?token=<paypal_order_id>&PayerID=<payer_id>
 *
 * Iptal edilirse:
 *   https://hupiplay.uk/checkout?paypal=cancelled
 */
export default function PaypalReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { clearCart } = useCartStore()
  const { locale } = useTranslation()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token') // PayPal order id
    const payerId = searchParams.get('PayerID')

    // Iptal: PayPal'da iptal edildi
    if (!token || !payerId) {
      router.replace('/checkout?paypal=cancelled')
      return
    }

    // localStorage'dan bekleyen cart_id'yi al
    const cartId = typeof window !== 'undefined'
      ? localStorage.getItem('paypal_pending_cart_id')
      : null
    const savedLocale = typeof window !== 'undefined'
      ? localStorage.getItem('paypal_pending_locale') || locale
      : locale

    if (!cartId) {
      setStatus('error')
      setErrorMsg('Sepet bilgisi bulunamadı. Lütfen tekrar deneyin.')
      return
    }

    const complete = async () => {
      try {
        const response = await api.post('/store/orders/complete-paypal', {
          cart_id: cartId,
          paypal_token: token,
          locale: savedLocale,
        })

        // Temizle
        localStorage.removeItem('paypal_pending_cart_id')
        localStorage.removeItem('paypal_pending_locale')
        clearCart()

        const order = response.data.order
        const params = new URLSearchParams()
        params.set('order_id', order.id)
        params.set('method', 'paypal')
        if (order.display_id) params.set('no', String(order.display_id))
        if (order.total != null) params.set('total', String(order.total))
        if (order.currency_code) params.set('cc', order.currency_code)

        setStatus('success')
        router.replace(`/checkout/success?${params.toString()}`)
      } catch (err: any) {
        console.error('PayPal complete error:', err)
        setStatus('error')
        setErrorMsg(
          err?.response?.data?.message ||
          err?.message ||
          'PayPal ödemesi tamamlanamadı.'
        )
      }
    }

    complete()
  }, [])

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center p-6">
      <div className="gaming-card p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#ff6b35] mx-auto mb-6" />
            <h2 className="text-xl font-bold text-white mb-2">PayPal Ödemeniz İşleniyor...</h2>
            <p className="text-gray-400 text-sm">Lütfen bekleyin, siparişiniz oluşturuluyor.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-white mb-2">Ödeme Başarılı!</h2>
            <p className="text-gray-400 text-sm">Sipariş sayfasına yönlendiriliyorsunuz...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-white mb-2">Ödeme Tamamlanamadı</h2>
            <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={() => router.push('/checkout')}
              className="bg-[#ff6b35] text-white font-bold px-6 py-3 rounded-lg hover:bg-[#e55a24] transition-colors"
            >
              Tekrar Dene
            </button>
          </>
        )}
      </div>
    </div>
  )
}
