'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { useT } from '@/components/useT'
import { useTranslation } from '@/i18n/LocaleProvider'
import { formatCurrency, formatDate } from '@/i18n'

interface OrderItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  thumbnail?: string
  metadata?: {
    digital_key?: string
    platform?: string
    region?: string
  }
}

interface Order {
  id: string
  display_id: number
  created_at: string
  status: string
  payment_status: string
  fulfillment_status: string
  email: string
  total: number
  subtotal: number
  tax_total: number
  currency_code: string
  items: OrderItem[]
  billing_address: {
    first_name: string
    last_name: string
    address_1: string
    city: string
    postal_code: string
    country_code: string
  }
}

export default function OrderDetailPage() {
  const t = useT()
  const { locale } = useTranslation()
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/store/orders/${orderId}`)
        setOrder(response.data.order)
      } catch (error) {
        console.error('Failed to fetch order:', error)
        toast.error(t('orderDetail.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId])

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success(t('orderDetail.keyCopied'), {
      icon: '📋',
      style: {
        background: '#15171c',
        color: '#fff',
        border: '1px solid #ff6b35',
      },
    })
  }

  const handleRevealKey = (itemId: string) => {
    setRevealedKeys((prev) => new Set([...prev, itemId]))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-white mb-4">{t('orderDetail.notFound')}</h1>
          <Link href="/account/orders" className="btn-primary">
            {t('orderDetail.backToOrders')}
          </Link>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'fulfilled':
      case 'paid':
        return 'bg-green-500/10 border-green-500/30 text-green-500'
      case 'pending':
      case 'awaiting':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
      case 'cancelled':
      case 'refunded':
        return 'bg-red-500/10 border-red-500/30 text-red-500'
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-500'
    }
  }

  const statusLabel = (status: string) => {
    const key = `status.${status.toLowerCase()}`
    const value = t(key)
    return value === key ? status.toUpperCase() : value
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">

      {/* Breadcrumb */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-[#ff6b35] transition">
              {t('common.home')}
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/account" className="text-gray-400 hover:text-[#ff6b35] transition">
              {t('account.accountBreadcrumb')}
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/account/orders" className="text-gray-400 hover:text-[#ff6b35] transition">
              {t('account.ordersBreadcrumb')}
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold">{t('success.orderNumber', { id: order.display_id })}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Order Header */}
          <div className="gaming-card p-8 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-black text-white mb-4">{t('success.orderNumber', { id: order.display_id })}</h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                      order.payment_status
                    )}`}
                  >
                    {t('orderDetail.payment')}: {statusLabel(order.payment_status)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                      order.fulfillment_status
                    )}`}
                  >
                    {t('orderDetail.delivery')}: {statusLabel(order.fulfillment_status)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">{t('orderDetail.orderDate')}</div>
                <div className="text-white font-bold">
                  {formatDate(order.created_at, locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </div>

            <div className="bg-[#1a1d24] rounded-lg p-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm text-gray-500 mb-2">{t('orderDetail.customerEmail')}</h3>
                  <p className="text-white font-semibold">{order.email}</p>
                </div>
                <div>
                  <h3 className="text-sm text-gray-500 mb-2">{t('orderDetail.billingAddress')}</h3>
                  <p className="text-white font-semibold">
                    {order.billing_address.first_name} {order.billing_address.last_name}
                    <br />
                    {order.billing_address.address_1}
                    <br />
                    {order.billing_address.city}, {order.billing_address.postal_code}
                    <br />
                    {order.billing_address.country_code}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items with Keys */}
          <div className="gaming-card p-8 mb-6">
            <h2 className="text-2xl font-black text-white mb-6">{t('orderDetail.yourKeys')}</h2>
            <div className="space-y-4">
              {order.items.map((item) => {
                const isRevealed = revealedKeys.has(item.id)
                const hasKey = item.metadata?.digital_key

                return (
                  <div key={item.id} className="bg-[#1a1d24] rounded-lg p-6">
                    <div className="flex gap-4 mb-4">
                      <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <span className="text-4xl">🎮</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {item.metadata?.platform && (
                            <span className="bg-[#0a0b0d] border border-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                              {item.metadata.platform}
                            </span>
                          )}
                          {item.metadata?.region && (
                            <span className="bg-[#0a0b0d] border border-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                              {item.metadata.region}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          {t('orderDetail.quantityPrice', {
                            count: item.quantity,
                            price: formatCurrency(item.unit_price / 100, order.currency_code, locale),
                          })}
                        </p>
                      </div>
                    </div>

                    {hasKey ? (
                      <div className="bg-[#0a0b0d] border-2 border-[#ff6b35]/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-[#ff6b35]">{t('orderDetail.gameKey')}</span>
                          <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">{t('orderDetail.available')}</span>
                        </div>

                        {isRevealed ? (
                          <div>
                            <div className="bg-[#15171c] border border-gray-700 rounded p-4 mb-3">
                              <div className="font-mono text-2xl text-[#ff6b35] font-bold break-all">
                                {item.metadata?.digital_key}
                              </div>
                            </div>
                            <button
                              onClick={() => handleCopyKey(item.metadata?.digital_key || '')}
                              className="w-full btn-secondary"
                            >
                              {t('orderDetail.copyKey')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRevealKey(item.id)}
                            className="w-full btn-primary"
                          >
                            {t('orderDetail.revealKey')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                        <p className="text-yellow-500 font-semibold">{t('orderDetail.keySoon')}</p>
                        <p className="text-gray-400 text-sm mt-1">{t('orderDetail.processingOrder')}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="gaming-card p-8">
            <h2 className="text-2xl font-black text-white mb-6">{t('orderDetail.summary')}</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-gray-400">
                <span>{t('orderDetail.subtotal')}</span>
                <span>
                  {formatCurrency(order.subtotal / 100, order.currency_code, locale)}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>{t('orderDetail.tax')}</span>
                <span>
                  {formatCurrency(order.tax_total / 100, order.currency_code, locale)}
                </span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between text-white font-bold text-2xl">
                <span>{t('orderDetail.total')}</span>
                <span>
                  {formatCurrency(order.total / 100, order.currency_code, locale)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link href="/account/orders" className="btn-secondary">
              {t('orderDetail.backToOrdersCta')}
            </Link>
            <button className="btn-secondary">📄 {t('account.downloadInvoice')}</button>
            <Link href="/contact" className="btn-secondary">
              {t('orderDetail.needHelp')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
