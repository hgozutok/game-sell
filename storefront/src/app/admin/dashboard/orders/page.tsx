'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type OrderItem = {
  id: string
  title?: string
  quantity: number
  unit_price?: number
  total?: number
}

type PaymentSession = {
  id: string
  provider_id?: string
  status?: string
  amount?: number
}

type Order = {
  id: string
  display_id?: number
  created_at: string
  email?: string
  total?: number
  currency_code?: string
  status?: string
  payment_status?: string
  metadata?: Record<string, any>
  items?: OrderItem[]
}

type OrderDetail = {
  id: string
  display_id?: number
  status?: string
  payment_status?: string
  fulfillment_status?: string
  email?: string
  total?: number
  subtotal?: number
  tax_total?: number
  shipping_total?: number
  currency_code?: string
  created_at: string
  payment_method?: string | null
  payment_provider?: string | null
  payment_approved?: boolean
  payment_approved_at?: string | null
  order_approved?: boolean
  order_approved_at?: string | null
  digital_fulfilled?: boolean
  fulfillment_state?: string | null
  metadata?: Record<string, any>
  items: OrderItem[]
}

const paymentLabels: Record<string, string> = {
  not_paid: 'Ödenmedi',
  awaiting: 'Ödeme bekliyor',
  authorized: 'Yetkilendirildi',
  partially_authorized: 'Kısmi yetki',
  captured: 'Tahsil edildi',
  partially_captured: 'Kısmi tahsil',
  refunded: 'İade edildi',
  partially_refunded: 'Kısmi iade',
  canceled: 'İptal',
}

const methodLabels: Record<string, string> = {
  stripe: 'Kredi Kartı (Stripe)',
  paypal: 'PayPal',
  mollie: 'Mollie',
  'bank-transfer': 'Banka Havalesi',
  bank_transfer: 'Banka Havalesi',
}

const stateLabels: Record<string, string> = {
  awaiting_approval: 'Onay bekliyor',
  awaiting_provider_mode: 'Sağlayıcı modu bekliyor',
  pending_fulfillment: 'Gönderim bekliyor',
  retrying: 'Yeniden deneniyor',
  fulfilled: 'Gönderildi',
  failed: 'Başarısız',
}

function money(minor?: number | null, currency = 'usd') {
  if (minor === null || minor === undefined) return '-'
  return `${(minor / 100).toFixed(2)} ${String(currency).toUpperCase()}`
}

function dateTime(value?: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return value
  }
}

export default function AdminOrdersControlPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [autoFulfill, setAutoFulfill] = useState<boolean>(false)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.get('/admin/order-control', { params: { limit: 50 } })
      setOrders(res.data?.orders || [])
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || 'Siparişler yüklenemedi',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (orderId: string) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await adminApi.get(`/admin/order-control/${orderId}`)
      setDetail(res.data?.order || null)
      return res.data?.order as OrderDetail | null
    } catch (e: any) {
      setDetail(null)
      setDetailError(e?.response?.data?.message || 'Sipariş detayı alınamadı')
      return null
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const loadSetting = useCallback(async () => {
    try {
      const res = await adminApi.get('/admin/settings', { params: { category: 'general' } })
      const list: Array<{ key: string; value: any }> = res.data?.settings || []
      const found = list.find((s) => s.key === 'orders.auto_fulfillment_enabled')
      setAutoFulfill(found?.value === true)
    } catch {
      setAutoFulfill(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
    loadSetting()
  }, [loadOrders, loadSetting])

  const selectOrder = async (orderId: string) => {
    setSelectedId(orderId)
    setMessage(null)
    await loadDetail(orderId)
  }

  const approve = async (orderId: string, target: 'order' | 'payment') => {
    setBusy(`${target}-${orderId}`)
    setMessage(null)
    try {
      await adminApi.post(`/admin/order-control/${orderId}/approve`, { target, approved: true })
      const fresh = await loadDetail(orderId)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, metadata: fresh?.metadata || o.metadata } : o))
      )
      setMessage({
        ok: true,
        text:
          target === 'order'
            ? 'Sipariş onaylandı. Ödeme de onaylıysa key gönderebilirsiniz.'
            : 'Ödeme onaylandı. Sipariş de onaylıysa key gönderebilirsiniz.',
      })
    } catch (e: any) {
      setMessage({ ok: false, text: e?.response?.data?.message || 'Onay başarısız' })
    } finally {
      setBusy(null)
    }
  }

  const fulfillNow = async (orderId: string) => {
    setBusy(`fulfill-${orderId}`)
    setMessage(null)
    try {
      await adminApi.post(`/admin/order-control/${orderId}/fulfill`)
      setMessage({ ok: true, text: 'Keyler gönderildi' })
      await loadDetail(orderId)
      await loadOrders()
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Gönderim başarısız',
      })
    } finally {
      setBusy(null)
    }
  }

  const toggleAutoFulfill = async () => {
    const next = !autoFulfill
    setBusy('auto')
    try {
      await adminApi.post('/admin/settings', {
        key: 'orders.auto_fulfillment_enabled',
        value: next,
        category: 'general',
        description: 'Enable/disable automatic digital fulfillment',
      })
      setAutoFulfill(next)
      setMessage({
        ok: true,
        text: next
          ? 'Otomatik gönderim açıldı (yine de sipariş + ödeme onayı gerekir).'
          : 'Otomatik gönderim kapatıldı.',
      })
    } catch {
      setMessage({ ok: false, text: 'Ayar kaydedilemedi' })
    } finally {
      setBusy(null)
    }
  }

  const paymentApproved = Boolean(detail?.payment_approved)
  const orderApproved = Boolean(detail?.order_approved)
  const fulfilled = Boolean(detail?.digital_fulfilled || detail?.metadata?.digital_fulfilled)
  const canFulfill = paymentApproved && orderApproved && !fulfilled
  const selectedOrder = orders.find((o) => o.id === selectedId) || null
  const currency = detail?.currency_code || selectedOrder?.currency_code || 'usd'

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">🧾 Sipariş Kontrol</h1>
            <p className="text-gray-400">Sipariş ve ödeme detayı, manuel key teslimatı</p>
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

        <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">Otomatik Fulfillment</h2>
            <p className="text-gray-400 text-sm">
              Açık olsa bile key yalnızca sipariş + ödeme onayı verildikten sonra gönderilir.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${autoFulfill ? 'text-green-400' : 'text-gray-400'}`}>
              {autoFulfill ? 'Açık' : 'Kapalı'}
            </span>
            <button
              disabled={busy === 'auto'}
              onClick={toggleAutoFulfill}
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-60"
            >
              {autoFulfill ? 'Kapat' : 'Aç'}
            </button>
          </div>
        </div>

        <div className="grid xl:grid-cols-5 gap-6 items-start">
          {/* Sipariş listesi */}
          <div className="xl:col-span-3 bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
              <h2 className="text-xl font-black text-white">Siparişler</h2>
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
                    <tr className="text-left text-gray-500">
                      <th className="px-4 py-3">Sipariş</th>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Müşteri</th>
                      <th className="px-4 py-3">Tutar</th>
                      <th className="px-4 py-3">Ödeme</th>
                      <th className="px-4 py-3">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const isSelected = selectedId === order.id
                      const approved =
                        order.metadata?.payment_approved === true ||
                        ['captured', 'partially_captured'].includes(String(order.payment_status))
                      const orderOk = order.metadata?.order_approved === true
                      return (
                        <tr
                          key={order.id}
                          onClick={() => selectOrder(order.id)}
                          className={`border-t border-gray-800 text-gray-200 cursor-pointer transition ${
                            isSelected ? 'bg-[#1a1d24]' : 'hover:bg-[#1a1d24]/60'
                          }`}
                        >
                          <td className="px-4 py-3 font-mono">
                            {order.display_id ? `#${order.display_id}` : order.id.slice(0, 10)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(order.created_at).toLocaleString('tr-TR')}
                          </td>
                          <td className="px-4 py-3">{order.email || '-'}</td>
                          <td className="px-4 py-3">
                            {money(order.total, order.currency_code || 'usd')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                approved
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {approved ? 'Onaylı' : 'Bekliyor'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                orderOk
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : 'bg-gray-700 text-gray-300'
                              }`}
                            >
                              {orderOk ? 'Sipariş onaylı' : 'Sipariş onayı yok'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detay paneli */}
          <div className="xl:col-span-2 bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden xl:sticky xl:top-6">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-xl font-black text-white">Sipariş & Ödeme Detayı</h2>
              <p className="text-gray-400 text-sm">
                {detail
                  ? `#${detail.display_id || detail.id.slice(0, 10)}`
                  : 'Detay için soldan bir sipariş seçin'}
              </p>
            </div>

            <div className="p-6">
              {!selectedId ? (
                <div className="text-gray-400 text-sm">Henüz sipariş seçilmedi.</div>
              ) : detailLoading ? (
                <div className="text-gray-400 text-sm">Detay yükleniyor…</div>
              ) : detailError ? (
                <div className="space-y-3">
                  <div className="text-red-400 text-sm">{detailError}</div>
                  <button
                    onClick={() => loadDetail(selectedId)}
                    className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35]"
                  >
                    Tekrar dene
                  </button>
                </div>
              ) : !detail ? (
                <div className="text-gray-400 text-sm">Detay bulunamadı.</div>
              ) : (
                <div className="space-y-5 text-sm">
                  {/* Onay durumları */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`rounded-lg border p-3 ${
                        paymentApproved
                          ? 'border-green-500/40 bg-green-500/10'
                          : 'border-yellow-500/40 bg-yellow-500/10'
                      }`}
                    >
                      <div className="text-xs text-gray-400 mb-1">Ödeme onayı</div>
                      <div className={paymentApproved ? 'text-green-400' : 'text-yellow-400'}>
                        {paymentApproved ? 'Onaylı' : 'Bekliyor'}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {dateTime(detail.payment_approved_at)}
                      </div>
                    </div>
                    <div
                      className={`rounded-lg border p-3 ${
                        orderApproved
                          ? 'border-blue-500/40 bg-blue-500/10'
                          : 'border-yellow-500/40 bg-yellow-500/10'
                      }`}
                    >
                      <div className="text-xs text-gray-400 mb-1">Sipariş onayı</div>
                      <div className={orderApproved ? 'text-blue-400' : 'text-yellow-400'}>
                        {orderApproved ? 'Onaylı' : 'Bekliyor'}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {dateTime(detail.order_approved_at)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-gray-300">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Müşteri</span>
                      <span className="text-right">{detail.email || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Sipariş durumu</span>
                      <span>{detail.status || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Ödeme yöntemi</span>
                      <span>{methodLabels[detail.payment_method || ''] || detail.payment_method || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Sağlayıcı</span>
                      <span>{detail.payment_provider || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Ödeme durumu</span>
                      <span>{paymentLabels[detail.payment_status || ''] || detail.payment_status || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Teslimat</span>
                      <span>
                        {fulfilled
                          ? 'Gönderildi'
                          : stateLabels[detail.fulfillment_state || ''] ||
                            detail.fulfillment_state ||
                            'Bekliyor'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Tarih</span>
                      <span>{dateTime(detail.created_at)}</span>
                    </div>
                  </div>

                  {/* Kalemler */}
                  <div>
                    <h3 className="text-white font-bold mb-2">Ürünler</h3>
                    <div className="rounded-lg border border-gray-800 overflow-hidden">
                      <table className="min-w-full text-xs">
                        <thead className="bg-[#0f1116] text-gray-500">
                          <tr>
                            <th className="text-left px-3 py-2">Ürün</th>
                            <th className="text-right px-3 py-2">Adet</th>
                            <th className="text-right px-3 py-2">Toplam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.items.map((item) => (
                            <tr key={item.id} className="border-t border-gray-800 text-gray-200">
                              <td className="px-3 py-2">{item.title}</td>
                              <td className="px-3 py-2 text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">
                                {money(item.total, currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Toplamlar */}
                  <div className="space-y-2 border-t border-gray-800 pt-3 text-gray-300">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Ara toplam</span>
                      <span>{money(detail.subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Vergi</span>
                      <span>{money(detail.tax_total, currency)}</span>
                    </div>
                    <div className="flex justify-between gap-3 text-white font-bold">
                      <span>Toplam</span>
                      <span>{money(detail.total, currency)}</span>
                    </div>
                  </div>

                  {/* Banka havalesi bilgileri */}
                  {detail.metadata?.payment_instructions && (
                    <div className="rounded-lg border border-gray-800 bg-[#0f1116] p-3 space-y-1 text-xs text-gray-300">
                      <div className="text-white font-bold mb-1">Banka Havalesi Bilgileri</div>
                      {detail.metadata.payment_instructions.bank_name && (
                        <div>Banka: {detail.metadata.payment_instructions.bank_name}</div>
                      )}
                      {detail.metadata.payment_instructions.account_name && (
                        <div>Hesap sahibi: {detail.metadata.payment_instructions.account_name}</div>
                      )}
                      {detail.metadata.payment_instructions.iban && (
                        <div>IBAN: {detail.metadata.payment_instructions.iban}</div>
                      )}
                      {detail.metadata.payment_instructions.account_number && (
                        <div>Hesap no: {detail.metadata.payment_instructions.account_number}</div>
                      )}
                      {detail.metadata.payment_instructions.sort_code && (
                        <div>Sort code: {detail.metadata.payment_instructions.sort_code}</div>
                      )}
                      {detail.metadata.payment_instructions.swift && (
                        <div>SWIFT: {detail.metadata.payment_instructions.swift}</div>
                      )}
                      {detail.metadata.payment_instructions.note && (
                        <div className="text-gray-500">{detail.metadata.payment_instructions.note}</div>
                      )}
                    </div>
                  )}

                  {/* Aksiyonlar */}
                  <div className="space-y-2 border-t border-gray-800 pt-4">
                    <button
                      onClick={() => approve(detail.id, 'order')}
                      disabled={orderApproved || busy !== null}
                      className="w-full px-4 py-2 bg-blue-500/15 border border-blue-500/40 text-blue-300 rounded-lg disabled:opacity-40"
                    >
                      {orderApproved ? 'Sipariş Onaylı' : 'Siparişi Onayla'}
                    </button>
                    <button
                      onClick={() => approve(detail.id, 'payment')}
                      disabled={paymentApproved || busy !== null}
                      className="w-full px-4 py-2 bg-green-500/15 border border-green-500/40 text-green-300 rounded-lg disabled:opacity-40"
                    >
                      {paymentApproved ? 'Ödeme Onaylı' : 'Ödemeyi Onayla'}
                    </button>
                    <button
                      onClick={() => fulfillNow(detail.id)}
                      disabled={!canFulfill || busy !== null}
                      className="w-full px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold disabled:opacity-40"
                    >
                      {fulfilled
                        ? 'Gönderildi'
                        : busy === `fulfill-${detail.id}`
                          ? 'Gönderiliyor…'
                          : 'Keyleri Gönder'}
                    </button>
                    {!canFulfill && !fulfilled && (
                      <p className="text-xs text-yellow-400">
                        Key gönderimi için sipariş ve ödeme onayının ikisi de gerekli.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
