'use client'

import { useEffect, useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { api } from '@/lib/api'
import { useT } from '@/components/useT'

type Props = {
  clientSecret: string
  cartId: string
  amountLabel: string
  publishableKey?: string
  onSuccess: (order: any) => void
  onClose: () => void
}

function PaymentForm({ cartId, amountLabel, onSuccess, onClose }: Omit<Props, 'clientSecret'>) {
  const t = useT()
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setError(null)

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/checkout` },
    })

    if (stripeError) {
      setError(stripeError.message || t('stripe.paymentFailed'))
      setSubmitting(false)
      return
    }

    if (paymentIntent && ['succeeded', 'processing', 'requires_capture'].includes(paymentIntent.status)) {
      try {
        const res = await api.post('/store/orders/complete', {
          cart_id: cartId,
          payment_method: 'stripe',
        })
        onSuccess(res.data?.order)
        return
      } catch (e: any) {
        setError(e?.response?.data?.message || t('stripe.orderFailed'))
        setSubmitting(false)
        return
      }
    }

    setError(t('stripe.status', { status: paymentIntent?.status || t('stripe.unknownStatus') }))
    setSubmitting(false)
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 rounded-lg border border-gray-700 bg-[#1a1d24] px-4 py-3 text-sm text-gray-300 hover:border-gray-500 disabled:opacity-50"
        >
          {t('stripe.cancel')}
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-[2] rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#f7931e] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {submitting ? t('stripe.processing') : t('stripe.pay', { amount: amountLabel })}
        </button>
      </div>
      <p className="text-center text-[11px] text-gray-500">
        {t('stripe.securityNote')}
      </p>
    </form>
  )
}

export default function StripePaymentModal({
  clientSecret,
  cartId,
  amountLabel,
  publishableKey: publishableKeyProp,
  onSuccess,
  onClose,
}: Props) {
  const t = useT()
  const publishableKey =
    publishableKeyProp || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!stripePromise) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#15171c] p-6">
          <h3 className="mb-2 text-lg font-bold text-white">{t('stripe.notConfigured')}</h3>
          <p className="mb-4 text-sm text-gray-400">
            <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> {t('stripe.notConfiguredDesc')}
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1d24] px-4 py-2 text-sm text-white"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#15171c] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">{t('stripe.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label={t('common.close')}>
            ✕
          </button>
        </div>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: 'night', variables: { colorPrimary: '#ff6b35' } },
          }}
        >
          <PaymentForm
            cartId={cartId}
            amountLabel={amountLabel}
            onSuccess={onSuccess}
            onClose={onClose}
          />
        </Elements>
      </div>
    </div>
  )
}
