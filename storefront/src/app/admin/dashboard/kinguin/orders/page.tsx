'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type QueueOrder = {
  id: string
  display_id?: number
  email?: string
  created_at: string
  total?: number
  metadata?: Record<string, any>
  items?: Array<{ id: string; title?: string; quantity: number }>
}

export default function KinguinOrdersPage() {
  const [orders, setOrders] = useState<QueueOrder[]>([])
  const [orderMode, setOrderMode] = useState<string>('readonly')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.get('/admin/kinguin/fulfillment-queue')
      setOrders(res.data?.orders || [])
      setOrderMode(res.data?.kinguin?.order_mode || 'readonly')
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Kuyruk yüklenemedi',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const approve = async (orderId: string) => {
    setBusy(orderId)
    setMessage(null)
    try {
      await adminApi.post('/admin/kinguin/fulfillment-queue/approve', { order_id: orderId })
      setMessage({ ok: true, text: 'Sipariş fulfill edildi' })
      await load()
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Fulfillment başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  const reject = async (orderId: string) => {
    if (!confirm('Bu siparişi reddetmek siparişi iptal eder. Emin misiniz?')) return
    setBusy(orderId)
    setMessage(null)
    try {
      await adminApi.post('/admin/kinguin/fulfillment-queue/reject', {
        order_id: orderId,
        reason: 'admin_rejected',
      })
      setMessage({ ok: true, text: 'Sipariş reddedildi ve iptal edildi' })
      await load()
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Red işlemi başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard/kinguin" className="text-gray-400 hover:text-white">
              ← Kinguin
            </Link>
            <div>
              <h1 className="text-3xl font-black text-white">Fulfillment Kuyruğu</h1>
              <p className="text-gray-400">Manuel onay gerektiren siparişler</p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              orderMode === 'live' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            }`}
          >
            ORDER MODE: {orderMode === 'live' ? 'LIVE' : 'READONLY'}
          </span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-4">
        {message && (
          <div
            className={`border px-4 py-3 rounded-lg text-sm ${
              message.ok
                ? 'bg-green-500/10 border-green-500/40 text-green-400'
                : 'bg-red-500/10 border-red-500/40 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {orderMode !== 'live' && (
          <div className="bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 px-4 py-3 rounded-lg text-sm">
            Order mode <b>readonly</b>. Onaylama yapılamaz — önce Kinguin ayarlarından order_mode=live
            yapılmalı.
          </div>
        )}

        <div className="bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">Yükleniyor…</div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-gray-500">Kuyrukta sipariş yok</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {orders.map((order) => (
                <div key={order.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-white font-semibold">
                      #{order.display_id || order.id.replace(/^order_/, '').slice(0, 8).toUpperCase()} · {order.email || 'misafir'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {order.created_at && !isNaN(new Date(order.created_at).getTime())
                        ? new Date(order.created_at).toLocaleString('tr-TR')
                        : '-'} ·{' '}
                      {order.metadata?.fulfillment_state || 'durum yok'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve(order.id)}
                      disabled={busy !== null || orderMode !== 'live'}
                      className="px-3 py-2 bg-green-500/15 border border-green-500/40 text-green-400 rounded-lg text-sm hover:bg-green-500/25 disabled:opacity-40"
                    >
                      {busy === order.id ? 'İşleniyor…' : 'Onayla ve Gönder'}
                    </button>
                    <button
                      onClick={() => reject(order.id)}
                      disabled={busy !== null}
                      className="px-3 py-2 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg text-sm hover:bg-red-500/25 disabled:opacity-40"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
