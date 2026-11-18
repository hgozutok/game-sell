'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type CustomerRow = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  has_account: boolean
  created_at: string | null
  active: boolean
  disabled_at: string | null
  email_verified: boolean
  order_count: number
  total_spent: number
  currency_code: string | null
  currency_totals: Array<{ currency_code: string; total: number }>
  last_order_at: string | null
}

type Summary = {
  total: number
  active: number
  disabled: number
  capped: boolean
}

const PAGE_SIZE = 20

const statusFilters: Array<{ value: 'all' | 'active' | 'disabled'; label: string }> = [
  { value: 'all', label: 'Tümü' },
  { value: 'active', label: 'Aktif' },
  { value: 'disabled', label: 'Pasif' },
]

function money(minor?: number | null, currency = 'usd') {
  if (minor === null || minor === undefined) return '-'
  return `${(minor / 100).toFixed(2)} ${String(currency || 'usd').toUpperCase()}`
}

function date(value?: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return value
  }
}

function fullName(customer: CustomerRow) {
  const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
  return name || customer.email
}

export default function AdminCustomersPage() {
  const [rows, setRows] = useState<CustomerRow[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, disabled: 0, capped: false })
  const [count, setCount] = useState(0)
  const [scanCapped, setScanCapped] = useState(false)
  const [ordersCapped, setOrdersCapped] = useState(false)

  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'disabled'>('all')
  const [page, setPage] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.get('/admin/customer-control', {
        params: {
          q: appliedSearch || undefined,
          status: status === 'all' ? undefined : status,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      })
      setRows(res.data?.customers || [])
      setCount(Number(res.data?.count) || 0)
      setSummary(
        res.data?.summary || { total: 0, active: 0, disabled: 0, capped: false }
      )
      setScanCapped(res.data?.scan_capped === true)
      setOrdersCapped(res.data?.orders_capped === true)
    } catch (e: any) {
      setRows([])
      setCount(0)
      setMessage({
        ok: false,
        text: e?.response?.data?.message || 'Kullanıcılar yüklenemedi',
      })
    } finally {
      setLoading(false)
    }
  }, [appliedSearch, status, page])

  useEffect(() => {
    load()
  }, [load])

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(0)
    setAppliedSearch(search.trim())
  }

  const changeStatus = (value: 'all' | 'active' | 'disabled') => {
    setStatus(value)
    setPage(0)
  }

  const toggleActive = async (customer: CustomerRow) => {
    const nextActive = !customer.active
    if (
      !nextActive &&
      !window.confirm(
        `${customer.email} hesabı pasifleştirilsin mi?\n\nKullanıcı giriş yapamaz; açık oturumlarında sipariş ve anahtar sayfaları kapanır.`
      )
    ) {
      return
    }

    setBusyId(customer.id)
    setMessage(null)
    try {
      await adminApi.post(`/admin/customer-control/${customer.id}`, { active: nextActive })
      setRows((prev) =>
        prev.map((row) =>
          row.id === customer.id
            ? {
                ...row,
                active: nextActive,
                disabled_at: nextActive ? null : new Date().toISOString(),
              }
            : row
        )
      )
      setSummary((prev) => ({
        ...prev,
        active: Math.max(0, prev.active + (nextActive ? 1 : -1)),
        disabled: Math.max(0, prev.disabled + (nextActive ? -1 : 1)),
      }))
      setMessage({
        ok: true,
        text: nextActive
          ? `${customer.email} yeniden aktifleştirildi.`
          : `${customer.email} pasifleştirildi. Kullanıcı artık giriş yapamaz.`,
      })
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || 'Durum güncellenemedi',
      })
    } finally {
      setBusyId(null)
    }
  }

  const firstIndex = count === 0 ? 0 : page * PAGE_SIZE + 1
  const lastIndex = Math.min((page + 1) * PAGE_SIZE, count)
  const hasPrev = page > 0
  const hasNext = (page + 1) * PAGE_SIZE < count

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">👥 Kullanıcılar</h1>
            <p className="text-gray-400">
              Kayıtlı müşteriler, sipariş sayısı / toplam harcama ve hesap durumu
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
          >
            ← Dashboard
          </Link>
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Toplam</div>
            <div className="text-3xl font-black text-white">{summary.total}</div>
            <div className="text-xs text-gray-500 mt-1">kayıtlı müşteri</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Aktif</div>
            <div className="text-3xl font-black text-green-400">{summary.active}</div>
            <div className="text-xs text-gray-500 mt-1">giriş yapabilir</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Pasif</div>
            <div className="text-3xl font-black text-red-400">{summary.disabled}</div>
            <div className="text-xs text-gray-500 mt-1">erişimi kapatıldı</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Listelenen</div>
            <div className="text-3xl font-black text-white">{count}</div>
            <div className="text-xs text-gray-500 mt-1">
              {status === 'all' ? 'tüm durumlar' : status === 'active' ? 'aktif hesaplar' : 'pasif hesaplar'}
            </div>
          </div>
        </div>

        <div className="bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-800">
            <form onSubmit={applySearch} className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="E-posta, ad veya soyad ara…"
                className="w-64 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm placeholder:text-gray-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition text-sm"
              >
                Ara
              </button>
              {appliedSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setAppliedSearch('')
                    setPage(0)
                  }}
                  className="px-3 py-2 text-gray-400 hover:text-white text-sm"
                >
                  Temizle
                </button>
              )}
            </form>

            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => changeStatus(filter.value)}
                    className={`px-3 py-2 rounded-lg text-sm border transition ${
                      status === filter.value
                        ? 'bg-[#ff6b35]/15 border-[#ff6b35]/50 text-[#ff6b35] font-semibold'
                        : 'bg-[#1a1d24] border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={load}
                className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition text-sm"
              >
                Yenile
              </button>
            </div>
          </div>

          {(scanCapped || ordersCapped) && (
            <div className="px-6 py-3 text-xs text-yellow-400 border-b border-gray-800 bg-yellow-500/5">
              {scanCapped && (
                <p>
                  Müşteri taraması 2000 kayıtla sınırlı; arama sonuçlarını daraltarak tam listeye
                  ulaşabilirsiniz.
                </p>
              )}
              {ordersCapped && (
                <p>
                  Sipariş özeti 5000 siparişle sınırlı; harcama toplamları eksik olabilir.
                </p>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-gray-400">Yükleniyor…</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              {appliedSearch || status !== 'all'
                ? 'Bu filtreye uyan kullanıcı bulunamadı.'
                : 'Henüz kayıtlı kullanıcı yok.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-3">Kullanıcı</th>
                    <th className="px-4 py-3">Kayıt</th>
                    <th className="px-4 py-3 text-right">Sipariş</th>
                    <th className="px-4 py-3 text-right">Toplam Harcama</th>
                    <th className="px-4 py-3">Son Sipariş</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((customer) => {
                    const multiCurrency = (customer.currency_totals || []).length > 1
                    return (
                      <tr
                        key={customer.id}
                        className="border-t border-gray-800 text-gray-200 align-top"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{fullName(customer)}</div>
                          <div className="text-xs text-gray-400">{customer.email}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {!customer.has_account && (
                              <span className="px-1.5 py-0.5 rounded bg-gray-700/50 text-[10px] text-gray-300">
                                Hesap yok
                              </span>
                            )}
                            {customer.has_account && !customer.email_verified && (
                              <span className="px-1.5 py-0.5 rounded bg-yellow-500/15 text-[10px] text-yellow-400">
                                E-posta doğrulanmadı
                              </span>
                            )}
                            {customer.phone && (
                              <span className="px-1.5 py-0.5 rounded bg-[#1a1d24] text-[10px] text-gray-400">
                                {customer.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                          {date(customer.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {customer.order_count || 0}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {customer.order_count > 0 ? (
                            <>
                              <div className="text-white font-semibold">
                                {money(customer.total_spent, customer.currency_code || 'usd')}
                              </div>
                              {multiCurrency && (
                                <div
                                  className="text-[10px] text-gray-500"
                                  title={customer.currency_totals
                                    .map((entry) => money(entry.total, entry.currency_code))
                                    .join(' · ')}
                                >
                                  {customer.currency_totals.length} para birimi
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                          {customer.last_order_at ? date(customer.last_order_at) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {customer.active ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                              Aktif
                            </span>
                          ) : (
                            <span
                              className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400"
                              title={
                                customer.disabled_at
                                  ? `Pasifleştirildi: ${date(customer.disabled_at)}`
                                  : undefined
                              }
                            >
                              Pasif
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {customer.has_account ? (
                            <button
                              type="button"
                              onClick={() => toggleActive(customer)}
                              disabled={busyId === customer.id}
                              className={`px-3 py-2 rounded-lg text-xs border transition disabled:opacity-50 ${
                                customer.active
                                  ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20'
                                  : 'bg-green-500/10 border-green-500/40 text-green-400 hover:bg-green-500/20'
                              }`}
                            >
                              {busyId === customer.id
                                ? 'Kaydediliyor…'
                                : customer.active
                                  ? 'Pasifleştir'
                                  : 'Aktifleştir'}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-800">
            <div className="text-xs text-gray-500">
              {count === 0 ? 'Kayıt yok' : `${firstIndex}–${lastIndex} / ${count}`}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={!hasPrev || loading}
                className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg text-sm hover:border-[#ff6b35] transition disabled:opacity-40"
              >
                ← Önceki
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext || loading}
                className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg text-sm hover:border-[#ff6b35] transition disabled:opacity-40"
              >
                Sonraki →
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Pasifleştirilen kullanıcı giriş yapamaz. Açık oturumu varsa sipariş oluşturma, sipariş
          geçmişi ve dijital anahtar uçları 403 döner. Tekrar aktifleştirilene kadar hesap kapalıdır.
        </p>
      </div>
    </div>
  )
}
