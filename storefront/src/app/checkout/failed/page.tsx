'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useT } from '@/components/useT'

function CheckoutFailedContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'unknown'
  const [supportEmail, setSupportEmail] = useState('support@digitalgamestore.com')

  useEffect(() => {
    api
      .get('/store/settings')
      .then((res) => {
        const email = res.data?.store?.support_email
        if (email) setSupportEmail(email)
      })
      .catch(() => null)
  }, [])

  const errorMessages: Record<string, string> = {
    payment_failed: t('failed.reason.payment_failed'),
    insufficient_funds: t('failed.reason.insufficient_funds'),
    card_declined: t('failed.reason.card_declined'),
    expired_card: t('failed.reason.expired_card'),
    invalid_card: t('failed.reason.invalid_card'),
    timeout: t('failed.reason.timeout'),
    unknown: t('failed.reason.unknown'),
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Error Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-red-500 rounded-full mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-5xl font-black text-white mb-4">{t('failed.title')}</h1>
            <p className="text-xl text-gray-300 mb-2">{t('failed.subtitle')}</p>
          </div>

          {/* Error Details */}
          <div className="gaming-card p-8 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">⚠️</div>
              <div>
                <h2 className="text-2xl font-black text-white mb-2">{t('failed.whatWrong')}</h2>
                <p className="text-gray-300">{errorMessages[reason] || errorMessages.unknown}</p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                <strong>{t('failed.important')}</strong> {t('failed.noCharge')}
              </p>
            </div>
          </div>

          {/* What to do next */}
          <div className="gaming-card p-8 mb-6">
            <h2 className="text-2xl font-black text-white mb-6">{t('failed.nextTitle')}</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{t('failed.step1Title')}</h3>
                  <p className="text-gray-400 text-sm">
                    {t('failed.step1Desc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{t('failed.step2Title')}</h3>
                  <p className="text-gray-400 text-sm">
                    {t('failed.step2Desc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{t('failed.step3Title')}</h3>
                  <p className="text-gray-400 text-sm">
                    {t('failed.step3Desc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{t('failed.step4Title')}</h3>
                  <p className="text-gray-400 text-sm">
                    {t('failed.step4Desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Payment Methods */}
          <div className="gaming-card p-8 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">{t('failed.altMethods')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">💳</div>
                <div className="text-sm text-gray-300">{t('failed.creditCard')}</div>
              </div>
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🅿️</div>
                <div className="text-sm text-gray-300">PayPal</div>
              </div>
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🇪🇺</div>
                <div className="text-sm text-gray-300">Mollie</div>
              </div>
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🏦</div>
                <div className="text-sm text-gray-300">{t('failed.bankTransfer')}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/checkout" className="btn-primary text-center">
              {t('failed.tryAgain')}
            </Link>
            <Link href="/cart" className="btn-secondary text-center">
              {t('failed.backToCart')}
            </Link>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center">
            <h3 className="font-bold text-white mb-2">{t('failed.immediateHelp')}</h3>
            <p className="text-gray-400 text-sm mb-4">
              {t('failed.helpDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="text-[#ff6b35] hover:underline font-semibold">
                {t('success.contactSupport')}
              </Link>
              <a href={`mailto:${supportEmail}`} className="text-[#ff6b35] hover:underline font-semibold">
                {t('failed.emailUs')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0b0d]" />}>
      <CheckoutFailedContent />
    </Suspense>
  )
}
