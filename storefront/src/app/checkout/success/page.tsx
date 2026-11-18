'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useT } from '@/components/useT'
import { useTranslation } from '@/i18n/LocaleProvider'
import { formatCurrency, formatDate } from '@/i18n'

interface Order {
  id: string
  display_id: number
  created_at: string
  total: number
  currency_code: string
  items: Array<{
    title: string
    quantity: number
    metadata?: {
      digital_key?: string
    }
  }>
}

function CheckoutSuccessContent() {
  const t = useT()
  const { locale } = useTranslation()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const method = searchParams.get('method') || ''
  const refFromUrl = searchParams.get('ref') || ''
  const noFromUrl = searchParams.get('no') || ''
  // Banka havalesinde müşteriye gösterilecek referans kodu
  const bankReference = refFromUrl || (noFromUrl ? `HUPI-${noFromUrl}` : '')
  const [bank, setBank] = useState<Record<string, string> | null>(null)

  // Banka havalesi secildiyse admin paneldeki hesap bilgilerini goster
  useEffect(() => {
    if (!method.startsWith('bank')) return
    api
      .get('/store/settings')
      .then((res) => setBank(res.data?.payments?.bank_transfer || null))
      .catch(() => setBank(null))
  }, [method])

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false)
        return
      }

      try {
        const response = await api.get(`/store/orders/${orderId}`)
        setOrder(response.data.order)
      } catch (error) {
        console.error('Failed to fetch order:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-6 animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-5xl font-black text-white mb-4">{t('success.title')}</h1>
            <p className="text-xl text-gray-300 mb-2">{t('success.thanks')}</p>
            {order && (
              <p className="text-gray-400">
                {t('success.orderNumber', { id: order.display_id })} •{' '}
                {formatDate(order.created_at, locale, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>

          {/* Bank Transfer Details */}
          {(bank || bankReference) && (
            <div className="gaming-card p-8 mb-6 border border-[#ff6b35]/40">
              <h2 className="text-2xl font-black text-white mb-2">{t('success.bankTitle')}</h2>
              <p className="text-sm text-gray-400 mb-6">
                {t('success.bankDesc')}
              </p>

              {bankReference && (
                <div className="mb-6 rounded-xl border border-[#ff6b35]/50 bg-[#ff6b35]/10 p-4">
                  <div className="text-[11px] uppercase tracking-wide text-[#ff6b35] mb-1">
                    {t('success.bank.reference')}
                  </div>
                  <div className="text-2xl font-black text-white font-mono break-all select-all">
                    {bankReference}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">{t('success.bank.referenceHint')}</p>
                </div>
              )}

              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  [t('success.bank.bankName'), bank?.bank_name],
                  [t('success.bank.accountName'), bank?.account_name],
                  [t('success.bank.iban'), bank?.iban],
                  [t('success.bank.accountNumber'), bank?.account_number],
                  [t('success.bank.sortCode'), bank?.sort_code],
                  [t('success.bank.swift'), bank?.swift],
                ]
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-[#1a1d24] border border-gray-800 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
                      <div className="text-white font-mono break-all">{value}</div>
                    </div>
                  ))}
              </dl>
              {!bank?.iban && !bank?.account_number && (
                <p className="mt-4 text-sm text-amber-400">{t('success.bank.missing')}</p>
              )}
              {bank?.note && <p className="mt-4 text-xs text-gray-500">{bank.note}</p>}
            </div>
          )}

          {/* What Happens Next */}
          <div className="gaming-card p-8 mb-6">
            <h2 className="text-2xl font-black text-white mb-6">{t('success.nextTitle')}</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{t('success.step1Title')}</h3>
                  <p className="text-gray-400 text-sm">
                    {t('success.step1Desc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{t('success.step2Title')}</h3>
                  <p className="text-gray-400 text-sm">
                    {t('success.step2Desc')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{t('success.step3Title')}</h3>
                  <p className="text-gray-400 text-sm">
                    {t('success.step3Desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          {order && (
            <div className="gaming-card p-8 mb-6">
              <h2 className="text-2xl font-black text-white mb-6">{t('success.orderDetails')}</h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="bg-[#1a1d24] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-white">{item.title}</h3>
                        <p className="text-sm text-gray-400">{t('success.quantity', { count: item.quantity })}</p>
                      </div>
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {t('success.delivered')}
                      </span>
                    </div>
                    {item.metadata?.digital_key && (
                      <div className="mt-3 bg-[#0a0b0d] border border-gray-700 rounded p-3">
                        <div className="text-xs text-gray-500 mb-1">{t('success.gameKey')}</div>
                        <div className="font-mono text-[#ff6b35] text-lg font-bold">{item.metadata.digital_key}</div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex justify-between text-lg font-bold text-white">
                    <span>{t('success.totalPaid')}</span>
                    <span>
                      {formatCurrency(order.total / 100, order.currency_code, locale)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/account/orders" className="btn-primary text-center">
              {t('success.viewAllOrders')}
            </Link>
            <Link href="/products" className="btn-secondary text-center">
              {t('success.continueShopping')}
            </Link>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center">
            <h3 className="font-bold text-white mb-2">{t('success.helpTitle')}</h3>
            <p className="text-gray-400 text-sm mb-4">
              {t('success.helpDesc')}
            </p>
            <Link href="/contact" className="text-[#ff6b35] hover:underline font-semibold">
              {t('success.contactSupport')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0b0d]" />}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
