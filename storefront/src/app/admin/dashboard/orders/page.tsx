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
  display_id?: number | null
  created_at: string
  email?: string | null
  customer_name?: string | null
  customer_email?: string | null
  total?: number
  currency_code?: string
  status?: string
  payment_status?: string
  metadata?: Record<string, any>
  items?: OrderItem[]
}

type OrderDetail = {
  id: string
  display_id?: number | null
  status?: string
  payment_status?: string
  fulfillment_status?: string
  email?: string | null
  customer_name?: string | null
  customer_email?: string | null
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
  canceled_at?: string | null
  cancellation_reason?: string | null
  refunded?: boolean
  refunded_at?: string | null
  refund_amount?: number | null
  refund_reason?: string | null
  metadata?: Record<string, any>
  digital_keys?: Array<{
    id: string
    key_code?: string | null
    provider?: string | null
    status?: string | null
    platform?: string | null
    region?: string | null
    assigned_at?: string | null
    delivered_at?: string | null
  }>
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
    const d = new Date(value)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleString('tr-TR')
  } catch {
    return '-'
  }
}

function orderNo(order?: { id: string; display_id?: number | null } | null) {
  if (!order) return '-'
  if (order.display_id) return `#${order.display_id}`
  const clean = order.id.replace(/^order_/, '')
  return `#${clean.slice(0, 8).toUpperCase()}`
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
  // Fulfillment guard ayarlari: hiz limiti (pestepe alim) + tutar esigi (TRY)
  const [velocityWindow, setVelocityWindow] = useState<number>(30)
  const [velocityMax, setVelocityMax] = useState<number>(5)
  const [maxTotalEur, setMaxTotalEur] = useState<number>(0)
  const [guardTriggeredAt, setGuardTriggeredAt] = useState<string | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [sandboxBusy, setSandboxBusy] = useState(false)
  const [sandboxResult, setSandboxResult] = useState<any>(null)
  const [returnBusy, setReturnBusy] = useState(false)
  const [returnMsg, setReturnMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
      // Guard ayarlari farkli kategorilere yazabilir — tum ayarlari oku
      const res = await adminApi.get('/admin/settings')
      const list: Array<{ key: string; value: any }> = res.data?.settings || []
      const find = (key: string) => list.find((s) => s.key === key)?.value
      setAutoFulfill(find('orders.auto_fulfillment_enabled') === true)
      setVelocityWindow(Number(find('orders.velocity_window_minutes') ?? 30) || 30)
      setVelocityMax(Number(find('orders.velocity_max_orders') ?? 5) || 5)
      setMaxTotalEur(Number(find('orders.auto_fulfill_max_total_eur') ?? 0) || 0)
      setGuardTriggeredAt((find('orders.velocity_guard_triggered_at') as string) || null)
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
    setSandboxResult(null)
    setMessage(null)
    await loadDetail(orderId)
  }

  const approve = async (orderId: string, target: 'order' | 'payment') => {
    setBusy(`${target}-${orderId}`)
    setMessage(null)
    try {
      const res = await adminApi.post(`/admin/order-control/${orderId}/approve`, {
        target,
        approved: true,
      })
      const fresh = await loadDetail(orderId)
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, metadata: fresh?.metadata || o.metadata } : o))
      )
      if (res.data?.auto_fulfilled) {
        setMessage({
          ok: true,
          text: 'Onay tamamlandı — iki onay da tam, keyler otomatik gönderildi.',
        })
        await loadOrders()
      } else if (res.data?.auto_fulfill_error) {
        setMessage({
          ok: false,
          text: `Onay verildi ama key gönderilemedi: ${res.data.auto_fulfill_error}`,
        })
      } else {
        setMessage({
          ok: true,
          text:
            target === 'order'
              ? 'Sipariş onaylandı. Ödeme de onaylıysa keyler otomatik gönderilecek.'
              : 'Ödeme onaylandı. Sipariş de onaylıysa keyler otomatik gönderilecek.',
        })
      }
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

  const cancelOrder = async (orderId: string) => {
    if (
      !window.confirm(
        'Bu siparişi iptal etmek istediğinize emin misiniz? Atanmış anahtarlar iptal edilecektir.'
      )
    ) {
      return
    }
    setBusy(`cancel-${orderId}`)
    setMessage(null)
    try {
      const res = await adminApi.post(`/admin/order-control/${orderId}/cancel`, {
        reason: 'Yönetici tarafından sipariş detay ekranından iptal edildi',
      })
      setMessage({
        ok: true,
        text: res.data?.message || 'Sipariş başarıyla iptal edildi',
      })
      await loadDetail(orderId)
      await loadOrders()
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Sipariş iptal edilemedi',
      })
    } finally {
      setBusy(null)
    }
  }

  const refundOrder = async (orderId: string) => {
    if (!window.confirm('Bu sipariş için para iadesi yapmak istediğinize emin misiniz?')) {
      return
    }
    setBusy(`refund-${orderId}`)
    setMessage(null)
    try {
      const res = await adminApi.post(`/admin/order-control/${orderId}/refund`, {
        reason: 'Yönetici tarafından para iadesi yapıldı',
      })
      setMessage({
        ok: true,
        text: res.data?.message || 'Para iadesi başarıyla tamamlandı',
      })
      await loadDetail(orderId)
      await loadOrders()
    } catch (e: any) {
      setMessage({
        ok: false,
        text: e?.response?.data?.message || e?.message || 'Para iadesi yapılamadı',
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
          ? 'Otomatik gönderim açıldı: ödeme tamamlanınca keyler otomatik gönderilecek.'
          : 'Otomatik gönderim kapatıldı.',
      })
    } catch {
      setMessage({ ok: false, text: 'Ayar kaydedilemedi' })
    } finally {
      setBusy(null)
    }
  }

  // Hiz limiti + tutar esigi ayarlarini toplu kaydet
  const saveGuardSettings = async () => {
    setSettingsSaving(true)
    setMessage(null)
    const items: Array<{ key: string; value: any; description: string }> = [
      {
        key: 'orders.velocity_window_minutes',
        value: Math.max(1, Math.round(velocityWindow || 30)),
        description: 'Peşpeşe alım alarmı zaman penceresi (dakika)',
      },
      {
        key: 'orders.velocity_max_orders',
        value: Math.max(1, Math.round(velocityMax || 5)),
        description: 'Pencere içinde izin verilen maksimum sipariş sayısı',
      },
      {
        key: 'orders.auto_fulfill_max_total_eur',
        value: Math.max(0, Number(maxTotalEur) || 0),
        description:
          'Sipariş tutarı bu EUR eşiğini aşarsa otomatik fulfillment manuel onaya düşer (0 = kapalı)',
      },
    ]
    try {
      for (const item of items) {
        await adminApi.post('/admin/settings', { ...item, category: 'general' })
      }
      await loadSetting()
      setMessage({
        ok: true,
        text:
          'Fulfillment kuralları kaydedildi: ' +
          `${Math.round(velocityWindow || 30)} dk / ${Math.round(velocityMax || 5)} sipariş, ` +
          `tutar eşiği ${Number(maxTotalEur) || 0} EUR ${Number(maxTotalEur) > 0 ? '' : '(kapalı)'}`,
      })
    } catch {
      setMessage({ ok: false, text: 'Kural ayarları kaydedilemedi' })
    } finally {
      setSettingsSaving(false)
    }
  }

  const testKinguinSandbox = async (orderId: string) => {
    setSandboxBusy(true)
    setSandboxResult(null)
    try {
      const res = await adminApi.post(`/admin/order-control/${orderId}/kinguin-sandbox-test`)
      setSandboxResult(res.data)
    } catch (e: any) {
      setSandboxResult({
        ok: false,
        message: e?.response?.data?.message || 'Kinguin sandbox testi başarısız',
        code: e?.response?.data?.code,
      })
    } finally {
      setSandboxBusy(false)
    }
  }

  // Kinguin key iadesi — iki asamali: talep -> admin onayi
  const requestKinguinReturn = async (orderId: string) => {
    setReturnBusy(true)
    setReturnMsg(null)
    try {
      const res = await adminApi.post(`/admin/order-control/${orderId}/kinguin-return-keys`)
      setReturnMsg({ ok: true, text: res.data?.message || 'İade talebi oluşturuldu' })
      await loadDetail(orderId)
    } catch (e: any) {
      setReturnMsg({
        ok: false,
        text: e?.response?.data?.message || 'İade talebi oluşturulamadı',
      })
    } finally {
      setReturnBusy(false)
    }
  }

  const resolveKinguinReturn = async (orderId: string, approved: boolean) => {
    setReturnBusy(true)
    setReturnMsg(null)
    try {
      const res = await adminApi.post(`/admin/order-control/${orderId}/kinguin-return-keys/approve`, {
        approved,
      })
      setReturnMsg({ ok: true, text: res.data?.message || (approved ? 'İade onaylandı' : 'İade reddedildi') })
      await loadDetail(orderId)
      await loadOrders()
    } catch (e: any) {
      setReturnMsg({
        ok: false,
        text: e?.response?.data?.message || 'İade işlemi başarısız',
      })
      await loadDetail(orderId)
    } finally {
      setReturnBusy(false)
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

        <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">Otomatik Fulfillment</h2>
              <p className="text-gray-400 text-sm">
                Açıkken ödemesi tamamlanan siparişler otomatik onaylanır ve keyleri gönderilir.
                Kapalıyken sipariş + ödeme onayı elle verilir.
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

          {/* Manuel onaya dusme kurallari */}
          <div className="border-t border-gray-800 pt-5">
            <h3 className="text-white font-bold mb-1">Manuel Onaya Düşme Kuralları</h3>
            <p className="text-gray-400 text-sm mb-4">
              Bu kurallardan biri tetiklenirse sipariş otomatik gönderim yerine manuel onay
              kuyruğuna düşer. Onay verildiğinde keyler otomatik gönderilir.
              {guardTriggeredAt && (
                <span className="text-yellow-500 block mt-1">
                  ⚠ Son hız alarmı: {new Date(guardTriggeredAt).toLocaleString('tr-TR')} — alarm
                  tetiklendiğinde otomatik gönderim kapatıldı.
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-gray-400 text-xs block mb-1">
                  Zaman penceresi (dakika)
                </label>
                <input
                  type="number"
                  min={1}
                  value={velocityWindow}
                  onChange={(e) => setVelocityWindow(Number(e.target.value))}
                  className="w-28 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">
                  Penceredeki maks. sipariş
                </label>
                <input
                  type="number"
                  min={1}
                  value={velocityMax}
                  onChange={(e) => setVelocityMax(Number(e.target.value))}
                  className="w-28 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">
                  Tutar eşiği (EUR, 0 = kapalı)
                </label>
                <input
                  type="number"
                  min={0}
                  step="10"
                  value={maxTotalEur}
                  onChange={(e) => setMaxTotalEur(Number(e.target.value))}
                  className="w-36 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <button
                disabled={settingsSaving}
                onClick={saveGuardSettings}
                className="px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-60"
              >
                {settingsSaving ? 'Kaydediliyor…' : 'Kuralları Kaydet'}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Örnek: 30 dk / 5 sipariş → 30 dakikada 5 sipariş geçilirse otomatik gönderim
              kapanır ve yeni siparişler manuel onaya düşer. Tutar eşiği 100 EUR → toplamı
              100 EUR ve üzeri olan siparişler manuel onay bekler.
            </p>
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
                      const isRefunded =
                        order.payment_status === 'refunded' ||
                        order.metadata?.refunded === true
                      const isCanceled = order.status === 'canceled'
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
                          <td className="px-4 py-3 font-mono font-semibold" title={order.id}>
                            {orderNo(order)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300">
                            {dateTime(order.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white truncate max-w-[200px]">
                              {order.email || order.customer_email || '-'}
                            </div>
                            {order.customer_name && (
                              <div className="text-xs text-gray-400 truncate max-w-[200px]">
                                {order.customer_name}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {money(order.total, order.currency_code || 'usd')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                isRefunded
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : approved
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {isRefunded ? 'İade Edildi' : approved ? 'Onaylı' : 'Bekliyor'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                isCanceled
                                  ? 'bg-red-500/20 text-red-400'
                                  : orderOk
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-gray-700 text-gray-300'
                              }`}
                            >
                              {isCanceled
                                ? 'İptal Edildi'
                                : orderOk
                                  ? 'Sipariş onaylı'
                                  : 'Sipariş onayı yok'}
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
              <p className="text-gray-400 text-sm font-mono">
                {detail ? (
                  <>
                    <span className="text-white font-bold">{orderNo(detail)}</span>
                    <span className="text-xs text-gray-500 ml-2">({detail.id})</span>
                  </>
                ) : (
                  'Detay için soldan bir sipariş seçin'
                )}
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
                      <div className="text-right">
                        <div className="text-white font-medium">{detail.email || detail.customer_email || '-'}</div>
                        {detail.customer_name && (
                          <div className="text-xs text-gray-400">{detail.customer_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Sipariş durumu</span>
                      <span className={detail.status === 'canceled' ? 'text-red-400 font-bold' : ''}>
                        {detail.status === 'canceled' ? 'İptal Edildi' : detail.status || '-'}
                      </span>
                    </div>
                    {detail.canceled_at && (
                      <div className="flex justify-between gap-3 text-red-400 text-xs">
                        <span>İptal Tarihi</span>
                        <span>{dateTime(detail.canceled_at)}</span>
                      </div>
                    )}
                    {detail.cancellation_reason && (
                      <div className="flex justify-between gap-3 text-red-400/80 text-xs">
                        <span>İptal Nedeni</span>
                        <span className="text-right">{detail.cancellation_reason}</span>
                      </div>
                    )}
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
                      <span className={detail.payment_status === 'refunded' || detail.refunded ? 'text-purple-400 font-bold' : ''}>
                        {detail.payment_status === 'refunded' || detail.refunded
                          ? 'İade Edildi'
                          : paymentLabels[detail.payment_status || ''] || detail.payment_status || '-'}
                      </span>
                    </div>
                    {(detail.refunded || detail.payment_status === 'refunded') && (
                      <div className="flex justify-between gap-3 text-purple-400 text-xs">
                        <span>İade Tutarı</span>
                        <span>{money(detail.refund_amount, currency)}</span>
                      </div>
                    )}
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

                  {/* Sipariş anahtarları */}
                  {detail.digital_keys && detail.digital_keys.length > 0 && (
                    <div>
                      <h3 className="text-white font-bold mb-2">Sipariş Anahtarları</h3>
                      <div className="space-y-2">
                        {detail.digital_keys.map((key) => (
                          <div
                            key={key.id}
                            className="rounded-lg border border-gray-800 bg-[#0f1116] p-3 text-xs space-y-1"
                          >
                            <div className="font-mono text-gray-200 break-all">
                              {key.key_code || '-'}
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-[#1a1d24] border border-gray-700 text-gray-300">
                                {key.provider || 'bilinmiyor'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30 text-green-300">
                                {key.status || '-'}
                              </span>
                              {key.platform && (
                                <span className="px-2 py-0.5 rounded bg-[#1a1d24] border border-gray-700 text-gray-400">
                                  {key.platform}
                                </span>
                              )}
                              {key.region && (
                                <span className="px-2 py-0.5 rounded bg-[#1a1d24] border border-gray-700 text-gray-400">
                                  {key.region}
                                </span>
                              )}
                            </div>
                            {key.provider && key.provider !== 'kinguin' && (
                              <p className="text-[11px] text-yellow-400">
                                Bu anahtar Kinguin kaynaklı değil; sandbox testi Kinguin eşleşmesi gerektirir.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                    {/* Sipariş İptal & Para İadesi Butonları */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800">
                      <button
                        onClick={() => cancelOrder(detail.id)}
                        disabled={detail.status === 'canceled' || busy !== null}
                        className="px-3 py-2 bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                      >
                        {detail.status === 'canceled'
                          ? '❌ İptal Edildi'
                          : busy === `cancel-${detail.id}`
                            ? 'İptal ediliyor…'
                            : '🚫 Siparişi İptal Et'}
                      </button>
                      <button
                        onClick={() => refundOrder(detail.id)}
                        disabled={
                          detail.refunded ||
                          detail.payment_status === 'refunded' ||
                          busy !== null
                        }
                        className="px-3 py-2 bg-purple-500/15 border border-purple-500/40 text-purple-300 hover:bg-purple-500/25 rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                      >
                        {detail.refunded || detail.payment_status === 'refunded'
                          ? '↩️ İade Edildi'
                          : busy === `refund-${detail.id}`
                            ? 'İade ediliyor…'
                            : '💸 Para İadesi Yap'}
                      </button>
                    </div>
                    <button
                      onClick={() => testKinguinSandbox(detail.id)}
                      disabled={sandboxBusy || busy !== null}
                      className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-200 rounded-lg hover:border-[#ff6b35] disabled:opacity-40"
                    >
                      {sandboxBusy ? 'Sandbox testi çalışıyor…' : '🧪 Kinguin Sandbox Testi'}
                    </button>
                    {/* Kinguin key iadesi — talep + onay (ESA §14: key claim edilmeden) */}
                    {detail?.metadata?.kinguin_return_status === 'pending_approval' ? (
                      <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 space-y-2">
                        <p className="text-xs text-yellow-300 font-bold">
                          ↩️ İade talebi bekliyor — onayınız gerekiyor
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => resolveKinguinReturn(detail.id, true)}
                            disabled={returnBusy}
                            className="flex-1 px-3 py-2 bg-red-500/15 border border-red-500/40 text-red-300 rounded-lg disabled:opacity-40"
                          >
                            {returnBusy ? '…' : '✅ Onayla (Kinguin’e iade)'}
                          </button>
                          <button
                            onClick={() => resolveKinguinReturn(detail.id, false)}
                            disabled={returnBusy}
                            className="flex-1 px-3 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg disabled:opacity-40"
                          >
                            ❌ Reddet
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Onaylanınca key’ler Kinguin’e iade edilir, tutar Kinguin bakiyesine geri yazılır. Key’ler müşteriye teslim edildiyse iade edilemez.
                        </p>
                      </div>
                    ) : (
                      detail?.metadata?.kinguin_order_id &&
                      !fulfilled && (
                        <button
                          onClick={() => requestKinguinReturn(detail.id)}
                          disabled={returnBusy || busy !== null}
                          className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-200 rounded-lg hover:border-red-500/50 disabled:opacity-40"
                        >
                          {returnBusy ? 'Talep oluşturuluyor…' : '↩️ Kinguin Key İade Talebi'}
                        </button>
                      )
                    )}
                    {returnMsg && (
                      <div
                        className={`rounded-lg border p-3 text-xs ${
                          returnMsg.ok
                            ? 'bg-green-500/10 border-green-500/40 text-green-300'
                            : 'bg-red-500/10 border-red-500/40 text-red-300'
                        }`}
                      >
                        {returnMsg.text}
                      </div>
                    )}
                    {sandboxResult && (
                      <div
                        className={`rounded-lg border p-3 text-xs space-y-1 ${
                          sandboxResult.ok
                            ? 'bg-green-500/10 border-green-500/40 text-green-300'
                            : 'bg-red-500/10 border-red-500/40 text-red-300'
                        }`}
                      >
                        <div className="font-bold text-white">
                          {sandboxResult.ok ? 'Sandbox sonucu' : 'Sandbox hatası'}
                        </div>
                        <p>{sandboxResult.message}</p>
                        {sandboxResult.local_order_keys && (
                          <p>
                            Yerel key: {sandboxResult.local_order_keys.count ?? 0}
                            {Array.isArray(sandboxResult.local_order_keys.statuses) &&
                              sandboxResult.local_order_keys.statuses.length > 0 &&
                              ` · ${sandboxResult.local_order_keys.statuses.join(', ')}`}
                          </p>
                        )}
                        {sandboxResult.sandbox_order_id && (
                          <p className="font-mono break-all">
                            Sandbox sipariş: {sandboxResult.sandbox_order_id}
                          </p>
                        )}
                        {typeof sandboxResult.test_key_count === 'number' && (
                          <p>Test anahtarı: {sandboxResult.test_key_count}</p>
                        )}
                        {Array.isArray(sandboxResult.test_keys) && sandboxResult.test_keys.length > 0 && (
                          <div className="pt-1 space-y-1">
                            {sandboxResult.test_keys.map((key: any, index: number) => (
                              <div key={index} className="font-mono break-all text-gray-200">
                                {key.serial || '-'} {key.name ? `· ${key.name}` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
