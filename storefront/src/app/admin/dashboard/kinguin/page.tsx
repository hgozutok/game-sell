'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type Balance = {
  balance: number
  currency: string
  min_balance: number
  order_mode: 'readonly' | 'live'
  low_balance: boolean
}

type SyncLog = {
  id: string
  type: string
  status: string
  items_total?: number
  items_added?: number
  items_updated?: number
  items_failed?: number
  pending_approvals?: number
  started_at?: string
}

type Approval = {
  id: string
  name?: string
  price?: number
  pending_price?: number
  pending_cost?: number
}

type QueueOrder = {
  id: string
  display_id?: number
  email?: string
  created_at: string
  total?: number
  metadata?: Record<string, any>
}

export default function KinguinPage() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [queue, setQueue] = useState<QueueOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [b, l, a, q] = await Promise.allSettled([
      adminApi.get('/admin/kinguin/balance'),
      adminApi.get('/admin/kinguin/sync-logs', { params: { limit: 8 } }),
      adminApi.get('/admin/kinguin/price-approvals'),
      adminApi.get('/admin/kinguin/fulfillment-queue'),
    ])

    if (b.status === 'fulfilled') setBalance(b.value.data)
    if (l.status === 'fulfilled') setLogs(l.value.data?.logs || [])
    if (a.status === 'fulfilled') setApprovals(a.value.data?.approvals || [])
    if (q.status === 'fulfilled') setQueue(q.value.data?.orders || [])

    const failure = [b, l, a, q].find((r) => r.status === 'rejected')
    if (failure && failure.status === 'rejected') {
      setMessage({
        ok: false,
        text:
          failure.reason?.response?.data?.message ||
          failure.reason?.message ||
          'Kinguin verileri yüklenemedi',
      })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const triggerSync = async (type: 'full' | 'price') => {
    setBusy(`sync-${type}`)
    setMessage(null)
    try {
      await adminApi.post('/admin/kinguin/sync-now', { type })
      setMessage({ ok: true, text: 'Senkronizasyon tamamlandı' })
      await load()
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Senkronizasyon başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  const decideApproval = async (id: string, action: 'approve' | 'reject') => {
    setBusy(`approval-${id}`)
    setMessage(null)
    try {
      await adminApi.post('/admin/kinguin/price-approvals', { id, action })
      setMessage({ ok: true, text: action === 'approve' ? 'Fiyat onaylandı' : 'Fiyat reddedildi' })
      await load()
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'İşlem başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  const money = (minor?: number | null) =>
    minor === null || minor === undefined ? '-' : `${(minor / 100).toFixed(2)} EUR`

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">🎮 Kinguin</h1>
            <p className="text-gray-400">Bakiye, senkronizasyon ve fulfillment kuyruğu</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                balance?.order_mode === 'live'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-green-500/20 text-green-400'
              }`}
            >
              ORDER MODE: {balance?.order_mode === 'live' ? 'LIVE' : 'READONLY'}
            </span>
            <button
              onClick={load}
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
            >
              Yenile
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
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

        {loading ? (
          <div className="py-16 text-center text-gray-400">Yükleniyor…</div>
        ) : (
          <>
            {/* Balance + actions */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
                <div className="text-xs text-gray-500 uppercase mb-1">Kinguin Bakiyesi</div>
                <div
                  className={`text-3xl font-black ${
                    balance?.low_balance ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  {balance ? `${balance.balance.toFixed(2)} ${balance.currency.toUpperCase()}` : '—'}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Min eşik: {balance?.min_balance ?? '-'} EUR
                  {balance?.low_balance ? ' · DÜŞÜK BAKİYE' : ''}
                </div>
              </div>

              <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 md:col-span-2">
                <div className="text-xs text-gray-500 uppercase mb-3">Senkronizasyon</div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => triggerSync('full')}
                    disabled={busy !== null}
                    className="px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    {busy === 'sync-full' ? 'Çalışıyor…' : 'Tam Senkron'}
                  </button>
                  <button
                    onClick={() => triggerSync('price')}
                    disabled={busy !== null}
                    className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] disabled:opacity-50"
                  >
                    {busy === 'sync-price' ? 'Çalışıyor…' : 'Sadece Fiyat'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Tam senkron uzun sürebilir; kayıtlar aşağıda listelenir.
                </p>
              </div>
            </div>

            {/* Sync logs */}
            <div className="bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-lg font-black text-white">Senkronizasyon Kayıtları</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-4 py-3">Tür</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3">Toplam</th>
                      <th className="px-4 py-3">Eklenen</th>
                      <th className="px-4 py-3">Güncellenen</th>
                      <th className="px-4 py-3">Hata</th>
                      <th className="px-4 py-3">Başlangıç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                          Kayıt yok
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="border-t border-gray-800 text-gray-200">
                          <td className="px-4 py-3">{log.type}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                log.status === 'completed'
                                  ? 'bg-green-500/20 text-green-400'
                                  : log.status === 'failed'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{log.items_total ?? 0}</td>
                          <td className="px-4 py-3">{log.items_added ?? 0}</td>
                          <td className="px-4 py-3">{log.items_updated ?? 0}</td>
                          <td className={`px-4 py-3 ${log.items_failed ? 'text-red-400' : ''}`}>
                            {log.items_failed ?? 0}
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {log.started_at ? new Date(log.started_at).toLocaleString('tr-TR') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Price approvals */}
            <div className="bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-black text-white">Onay Bekleyen Fiyatlar</h2>
                <span className="text-sm text-gray-400">{approvals.length} kayıt</span>
              </div>
              <div className="divide-y divide-gray-800">
                {approvals.length === 0 ? (
                  <div className="px-6 py-10 text-center text-gray-500">Onay bekleyen fiyat yok</div>
                ) : (
                  approvals.map((row) => (
                    <div key={row.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-white font-semibold">{row.name || row.id}</div>
                        <div className="text-xs text-gray-500">
                          Mevcut: {money(row.price)} · Yeni: {money(row.pending_price)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => decideApproval(row.id, 'approve')}
                          disabled={busy !== null}
                          className="px-3 py-2 bg-green-500/15 border border-green-500/40 text-green-400 rounded-lg text-sm hover:bg-green-500/25 disabled:opacity-50"
                        >
                          Onayla
                        </button>
                        <button
                          onClick={() => decideApproval(row.id, 'reject')}
                          disabled={busy !== null}
                          className="px-3 py-2 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg text-sm hover:bg-red-500/25 disabled:opacity-50"
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Fulfillment queue */}
            <div className="bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-black text-white">Fulfillment Kuyruğu</h2>
                <Link
                  href="/admin/dashboard/kinguin/orders"
                  className="text-sm text-[#ff6b35] hover:underline"
                >
                  Detay →
                </Link>
              </div>
              <div className="px-6 py-4">
                {queue.length === 0 ? (
                  <div className="text-gray-500 text-sm">Kuyrukta sipariş yok</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {queue.slice(0, 5).map((o) => (
                      <li key={o.id} className="flex items-center justify-between text-gray-200">
                        <span>
                          #{o.display_id || o.id.slice(0, 8)} · {o.email || 'misafir'}
                        </span>
                        <span className="text-gray-500">{o.metadata?.fulfillment_state || '-'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
