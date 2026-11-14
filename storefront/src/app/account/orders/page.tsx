'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useT } from '@/components/useT'
import { useTranslation } from '@/i18n/LocaleProvider'
import { formatCurrency, formatDate } from '@/i18n'

interface Order {
  id: string
  display_id: number
  created_at: string
  status: string
  total: number
  currency_code: string
  items: Array<{
    id: string
    title: string
    quantity: number
    thumbnail?: string
  }>
}

export default function OrdersPage() {
  const t = useT()
  const { locale } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/store/customers/me/orders')
        
        if (response.data.orders) {
          setOrders(response.data.orders)
        }
      } catch (error: any) {
        console.error('Failed to fetch orders:', error)
        // If endpoint doesn't exist, just show empty state (no orders yet)
        setOrders([])
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'fulfilled':
        return 'bg-green-500/10 border-green-500/30 text-green-500'
      case 'pending':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
      case 'cancelled':
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Breadcrumb */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-[#ff6b35] transition">
              {t('catalog.home')}
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/account" className="text-gray-400 hover:text-[#ff6b35] transition">
              {t('account.accountBreadcrumb')}
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold">{t('account.ordersBreadcrumb')}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a1d24] to-[#0a0b0d] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4">{t('account.ordersTitle')}</h1>
            <p className="text-xl text-gray-400">{t('account.ordersSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {error ? (
            <div className="gaming-card p-8 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-4">{t('account.unableLoad')}</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <Link href="/login" className="btn-primary inline-block">
                {t('account.logIn')}
              </Link>
            </div>
          ) : orders.length === 0 ? (
            <div className="gaming-card p-8 text-center">
              <div className="text-8xl mb-4 opacity-20">📦</div>
              <h2 className="text-3xl font-bold text-white mb-4">{t('account.noOrders')}</h2>
              <p className="text-gray-400 mb-6">
                {t('account.noOrdersDesc')}
              </p>
              <Link href="/products" className="btn-primary inline-block">
                {t('account.browseGames')}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="gaming-card p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-black text-white">{t('account.orderNumber')} #{order.display_id}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {formatDate(order.created_at, locale, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">{t('account.total')}</div>
                      <div className="text-2xl font-black text-white">
                        {formatCurrency(order.total / 100, order.currency_code, locale)}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-6">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 bg-[#1a1d24] rounded-lg p-4">
                        <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-3xl">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            '🎮'
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">{item.title}</h4>
                          <p className="text-sm text-gray-400">{t('account.quantity')}: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="btn-primary"
                    >
                      {t('account.viewDetails')}
                    </Link>
                    {order.status.toLowerCase() === 'completed' && (
                      <button className="btn-secondary">{t('account.downloadInvoice')}</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Section */}
          {orders.length > 0 && (
            <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center">
              <h3 className="font-bold text-white mb-2">{t('account.needHelpTitle')}</h3>
              <p className="text-gray-400 text-sm mb-4">
                {t('account.needHelpDesc')}
              </p>
              <Link href="/contact" className="text-[#ff6b35] hover:underline font-semibold">
                {t('account.contactSupport')} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
