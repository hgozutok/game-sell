'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type Order = {
  id: string
  display_id?: number
  created_at: string
  email?: string
  total?: number
  metadata?: Record<string, any>
  items: Array<{
    id: string
    title?: string
    quantity: number
    product?: { title?: string; metadata?: Record<string, any> }
    metadata?: Record<string, any>
  }>
}

export default function AdminOrdersControlPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [autoFulfill, setAutoFulfill] = useState<boolean>(true)
  const [savingSetting, setSavingSetting] = useState(false)
  const [fulfillingId, setFulfillingId] = useState<string | null>(null)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const res = await adminApi.get('/admin/orders?limit=25')
      setOrders(res.data?.orders || [])
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load orders', e)
    } finally {
      setLoading(false)
    }
  }

  const loadAutoFulfill = async () => {
    setToggling(true)
    try {
      const res = await adminApi.get('/admin/settings?category=general')
      const list: Array<{ key: string; value: any }> = res.data?.settings || []
      const found = list.find((s) => s.key === 'orders.auto_fulfillment_enabled')
      setAutoFulfill(found?.value !== false)
    } catch (e) {
      setAutoFulfill(true)
    } finally {
      setToggling(false)
    }
  }

  const saveAutoFulfill = async (value: boolean) => {
    setSavingSetting(true)
    try {
      await adminApi.post('/admin/settings', {
        key: 'orders.auto_fulfillment_enabled',
        value,
        category: 'general',
        description: 'Enable/disable automatic digital fulfillment',
      })
      setAutoFulfill(value)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save setting', e)
    } finally {
      setSavingSetting(false)
    }
  }

  const fulfillNow = async (orderId: string) => {
    setFulfillingId(orderId)
    try {
      await adminApi.post(`/admin/orders/${orderId}/fulfill`)
      await loadOrders()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to fulfill order', e)
    } finally {
      setFulfillingId(null)
    }
  }

  useEffect(() => {
    loadOrders()
    loadAutoFulfill()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">🧾 Sipariş Kontrol</h1>
            <p className="text-gray-400">Siparişleri görüntüle ve dijital teslimatı yönet</p>
          </div>
          <Link 
            href="/admin/dashboard"
            className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Auto-fulfillment toggle */}
        <div className="gaming-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">Otomatik Fulfillment</h2>
              <p className="text-gray-400 text-sm">Kinguin/CWS üzerinden otomatik anahtar tedariki</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${autoFulfill ? 'text-green-400' : 'text-gray-400'}`}>
                {toggling ? 'Yükleniyor…' : autoFulfill ? 'Açık' : 'Kapalı'}
              </span>
              <button
                disabled={savingSetting}
                onClick={() => saveAutoFulfill(!autoFulfill)}
                className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-60"
              >
                {savingSetting ? 'Kaydediliyor…' : autoFulfill ? 'Kapat' : 'Aç'}
              </button>
            </div>
          </div>
        </div>

        {/* Orders table */}
        <div className="gaming-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white">Son Siparişler</h2>
            <button
              onClick={loadOrders}
              className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
            >
              Yenile
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400">Yükleniyor…</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center text-gray-400">Kayıtlı sipariş bulunamadı.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="p-2">Order</th>
                    <th className="p-2">Tarih</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Ürünler</th>
                    <th className="p-2">Durum</th>
                    <th className="p-2 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const isFulfilled = Boolean(o.metadata?.digital_fulfilled)
                    const digitalCount = o.items.filter((it) => it.product?.metadata?.is_digital === true).length
                    return (
                      <tr key={o.id} className="border-t border-gray-800 text-gray-200">
                        <td className="p-2 font-mono">{o.display_id ? `#${o.display_id}` : o.id.slice(0, 10)}</td>
                        <td className="p-2">{new Date(o.created_at).toLocaleString()}</td>
                        <td className="p-2">{o.email || '-'}</td>
                        <td className="p-2">{digitalCount} dijital / {o.items.length} toplam</td>
                        <td className="p-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${isFulfilled ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-200'}`}>
                            {isFulfilled ? 'Fulfilled' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          <button
                            disabled={isFulfilled || fulfillingId === o.id}
                            onClick={() => fulfillNow(o.id)}
                            className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-60"
                          >
                            {fulfillingId === o.id ? 'Gönderiliyor…' : isFulfilled ? 'Tamamlandı' : 'Şimdi Gönder'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


