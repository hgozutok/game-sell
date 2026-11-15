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
  state: 'active' | 'stalled' | 'completed' | 'failed' | 'canceled' | string
  is_stale?: boolean
  can_cancel?: boolean
  items_total?: number
  items_added?: number
  items_updated?: number
  items_failed?: number
  pending_approvals?: number
  progress_total?: number
  progress_processed?: number
  progress_pct?: number | null
  started_at?: string
  finished_at?: string
  heartbeat_at?: string
  canceled_at?: string
  duration_seconds?: number | null
}

type KinguinStats = {
  products: number
  published: number
  catalog: number
  listed: number
  linked: number
  in_stock: number
  unlisted: number
  products_unlinked?: number
}

const SYNC_STATE_META: Record<string, { label: string; className: string }> = {
  active: { label: 'Aktif', className: 'bg-green-500/20 text-green-400' },
  stalled: { label: 'Takıldı', className: 'bg-orange-500/20 text-orange-400' },
  completed: { label: 'Tamamlandı', className: 'bg-green-500/20 text-green-400' },
  failed: { label: 'Başarısız', className: 'bg-red-500/20 text-red-400' },
  canceled: { label: 'İptal edildi', className: 'bg-gray-500/20 text-gray-300' },
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return value
  }
}

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return ''
  if (seconds < 60) return `${seconds} sn`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m} dk ${s} sn`
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
  const [stats, setStats] = useState<KinguinStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [listLimit, setListLimit] = useState(20)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [b, l, a, q, s] = await Promise.allSettled([
      adminApi.get('/admin/kinguin/balance'),
      adminApi.get('/admin/kinguin/sync-logs', { params: { limit: 20 } }),
      adminApi.get('/admin/kinguin/price-approvals'),
      adminApi.get('/admin/kinguin/fulfillment-queue'),
      adminApi.get('/admin/kinguin/stats'),
    ])

    if (b.status === 'fulfilled') setBalance(b.value.data)
    if (l.status === 'fulfilled') setLogs(l.value.data?.logs || [])
    if (a.status === 'fulfilled') setApprovals(a.value.data?.approvals || [])
    if (q.status === 'fulfilled') setQueue(q.value.data?.orders || [])
    if (s.status === 'fulfilled') setStats(s.value.data || null)

    const failure = [b, l, a, q, s].find((r) => r.status === 'rejected')
    if (failure && failure.status === 'rejected') {
      setMessage({
        ok: false,
        text:
          failure.reason?.response?.data?.message ||
          failure.reason?.message ||
          'Kinguin verileri yüklenemedi',
      })
    }
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Aktif bir sync varsa 5 saniyede bir sessizce yenile.
  useEffect(() => {
    const hasActive = logs.some((log) => log.state === 'active')
    if (!hasActive) return
    const timer = window.setInterval(() => load(true), 5000)
    return () => window.clearInterval(timer)
  }, [logs, load])

  const triggerSync = async (type: 'full' | 'price') => {
    setBusy(`sync-${type}`)
    setMessage(null)
    try {
      // Istek senkron beklemez; kayit olusur ve polling ile izlenir.
      await adminApi.post('/admin/products/sync', { type })
      setMessage({
        ok: true,
        text:
          type === 'price'
            ? 'Fiyat senkronizasyonu başlatıldı. Durumu kayıtlardan izleyin.'
            : 'Senkronizasyon başlatıldı. Durumu kayıtlardan izleyin.',
      })
      window.setTimeout(() => load(true), 1500)
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Senkronizasyon başlatılamadı',
      })
    } finally {
      setBusy(null)
    }
  }

  const cancelLog = async (id: string) => {
    if (!window.confirm('Bu senkronizasyonu iptal etmek istiyor musunuz?')) return
    setBusy(`cancel-${id}`)
    setMessage(null)
    try {
      await adminApi.post(`/admin/kinguin/sync-logs/${id}/cancel`)
      setMessage({ ok: true, text: 'Senkronizasyon iptal edildi' })
      await load(true)
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'İptal başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  const cancelStale = async () => {
    setBusy('cancel-stale')
    setMessage(null)
    try {
      const res = await adminApi.post('/admin/kinguin/sync-logs/cancel', { stale: true })
      const count = Number(res.data?.canceled || 0)
      setMessage({ ok: true, text: `${count} takılı senkron iptal edildi` })
      await load(true)
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'İptal başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  const reconcile = async () => {
    setBusy('reconcile')
    setMessage(null)
    try {
      const res = await adminApi.post('/admin/kinguin/reconcile')
      const d = res.data || {}
      setMessage({
        ok: true,
        text: `Eşitlendi: ${d.listed_after ?? 0} Kinguin ürünü listede, ${d.unlisted ?? 0} kayıt liste dışına alındı.`,
      })
      await load(true)
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Eşitleme başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  const listFromCatalog = async () => {
    if (
      !window.confirm(
        `Katalogdan uygun ${listLimit} ürünü mağazada listelemek istiyor musunuz? Bu işlem birkaç dakika sürebilir.`
      )
    ) {
      return
    }
    setBusy('bulk-list')
    setMessage(null)
    try {
      const res = await adminApi.post('/admin/kinguin/products/list-bulk', { limit: listLimit })
      const d = res.data || {}
      setMessage({
        ok: true,
        text: `${d.listed ?? 0} ürün listelendi, ${d.blocked_negative_margin ?? 0} ürün negatif marj nedeniyle atlandı.`,
      })
      await load(true)
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Toplu listeleme başarısız',
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

  const activeCount = logs.filter((log) => log.state === 'active').length
  const stalledCount = logs.filter((log) => log.state === 'stalled').length
  const hasActive = activeCount > 0

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
              onClick={() => load()}
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
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-xs text-gray-500 uppercase">Senkronizasyon</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={activeCount > 0 ? 'text-green-400' : 'text-gray-600'}>
                      ● {activeCount} aktif
                    </span>
                    <span className={stalledCount > 0 ? 'text-orange-400' : 'text-gray-600'}>
                      ● {stalledCount} takılı
                    </span>
                  </div>
                </div>

                {/* DB ve Kinguin sayilari tek bakista */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[11px] text-gray-500">Mağaza ürünü (DB)</div>
                    <div className="text-white font-bold">{stats?.products ?? '—'}</div>
                  </div>
                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[11px] text-gray-500">Yayında</div>
                    <div className="text-white font-bold">{stats?.published ?? '—'}</div>
                  </div>
                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[11px] text-gray-500">Kinguin katalog</div>
                    <div className="text-white font-bold">{stats?.catalog ?? '—'}</div>
                  </div>
                  <div className="bg-[#1a1d24] border border-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[11px] text-gray-500">Listede</div>
                    <div className="text-[#ff6b35] font-bold">{stats?.listed ?? '—'}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => triggerSync('full')}
                    disabled={busy !== null || hasActive}
                    className="px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    {busy === 'sync-full' || hasActive ? 'Senkron çalışıyor…' : 'Tam Senkron'}
                  </button>
                  <button
                    onClick={() => triggerSync('price')}
                    disabled={busy !== null || hasActive}
                    className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] disabled:opacity-50"
                  >
                    {busy === 'sync-price' ? 'Başlatılıyor…' : 'Sadece Fiyat'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Tam senkron arka planda çalışır; ilerleme ve iptal aşağıdaki kayıtlarda.
                </p>
              </div>
            </div>

            {/* Kinguin esitleme */}
            <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h2 className="text-lg font-black text-white">Kinguin Eşitleme</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Mağazada <span className="text-white">yayında</span> olan ürünler Kinguin
                    listesinde sayılır; taslak/silinmiş ürünler liste dışına alınır. Katalogdan
                    toplu ekleme, yalnızca stoklu ve geçerli fiyatlı ürünlerle sınırlıdır.
                  </p>
                  {stats && (
                    <div className="text-xs text-gray-500 mt-2">
                      Katalog {stats.catalog} · Listede {stats.listed} · Mağazaya bağlı{' '}
                      {stats.linked} · Stoklu {stats.in_stock} · Katalog karşılığı yok{' '}
                      {stats.products_unlinked ?? Math.max(0, stats.products - stats.linked)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <button
                    onClick={reconcile}
                    disabled={busy !== null}
                    className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] disabled:opacity-50"
                  >
                    {busy === 'reconcile' ? 'Eşitleniyor…' : 'Durumları Eşitle'}
                  </button>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={listLimit}
                      onChange={(e) =>
                        setListLimit(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
                      }
                      className="w-20 px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg"
                    />
                    <button
                      onClick={listFromCatalog}
                      disabled={busy !== null}
                      className="px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold disabled:opacity-50"
                    >
                      {busy === 'bulk-list' ? 'Listeleniyor…' : 'Katalogdan Listele'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync logs */}
            <div className="bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-white">Senkronizasyon Kayıtları</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Aktif: çalışıyor · Takıldı: 2 dakikadır sinyal yok · İptal edilebilir
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={activeCount > 0 ? 'text-green-400' : 'text-gray-500'}>
                    {activeCount} aktif
                  </span>
                  <span className={stalledCount > 0 ? 'text-orange-400' : 'text-gray-500'}>
                    {stalledCount} takılı
                  </span>
                  {stalledCount > 0 && (
                    <button
                      onClick={cancelStale}
                      disabled={busy !== null}
                      className="px-3 py-1.5 bg-orange-500/15 border border-orange-500/40 text-orange-400 rounded-lg hover:bg-orange-500/25 disabled:opacity-50"
                    >
                      {busy === 'cancel-stale' ? 'İptal ediliyor…' : 'Takılıları iptal et'}
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="px-4 py-3">Tür</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3">İlerleme</th>
                      <th className="px-4 py-3">Toplam</th>
                      <th className="px-4 py-3">Eklenen</th>
                      <th className="px-4 py-3">Güncellenen</th>
                      <th className="px-4 py-3">Hata</th>
                      <th className="px-4 py-3">Başlangıç</th>
                      <th className="px-4 py-3">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                          Kayıt yok
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const meta = SYNC_STATE_META[log.state] || {
                          label: log.state,
                          className: 'bg-gray-500/20 text-gray-300',
                        }
                        const pct = log.progress_pct ?? 0
                        return (
                          <tr key={log.id} className="border-t border-gray-800 text-gray-200">
                            <td className="px-4 py-3">{log.type}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs ${meta.className}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {log.progress_total && log.progress_total > 0 ? (
                                <div className="w-32">
                                  <div className="h-1.5 bg-gray-800 rounded">
                                    <div
                                      className="h-1.5 bg-[#ff6b35] rounded"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <div className="text-[11px] text-gray-500 mt-1">
                                    {log.progress_processed ?? 0}/{log.progress_total} (%{pct})
                                  </div>
                                </div>
                              ) : log.state === 'active' ? (
                                <span className="text-xs text-gray-400">
                                  {log.progress_processed ?? 0} işlendi
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-3">{log.items_total ?? 0}</td>
                            <td className="px-4 py-3">{log.items_added ?? 0}</td>
                            <td className="px-4 py-3">{log.items_updated ?? 0}</td>
                            <td className={`px-4 py-3 ${log.items_failed ? 'text-red-400' : ''}`}>
                              {log.items_failed ?? 0}
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              <div>{formatDateTime(log.started_at)}</div>
                              {log.duration_seconds != null && (
                                <div className="text-[11px] text-gray-600">
                                  {formatDuration(log.duration_seconds)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {log.can_cancel ? (
                                <button
                                  onClick={() => cancelLog(log.id)}
                                  disabled={busy !== null}
                                  className="px-3 py-1.5 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg text-xs hover:bg-red-500/25 disabled:opacity-50"
                                >
                                  {busy === `cancel-${log.id}` ? 'İptal ediliyor…' : 'İptal'}
                                </button>
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
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
