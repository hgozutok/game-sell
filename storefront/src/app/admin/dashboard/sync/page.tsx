'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type SyncLog = {
  id: string
  type?: string
  type_label?: string
  source?: string
  provider_label?: string
  status: 'success' | 'failed' | 'running' | 'stalled' | 'canceled' | string
  raw_status?: string
  is_stale?: boolean
  can_cancel?: boolean
  timestamp: string
  message?: string
  details?: string
  items_total?: number
  items_added?: number
  items_updated?: number
  items_failed?: number
  progress_total?: number
  progress_processed?: number
}

type SyncSettings = {
  sync_interval_minutes: number
  sync_prices: boolean
  sync_stock: boolean
  sync_info: boolean
  sync_new_products: boolean
  sync_new_products_limit: number
  hide_on_zero_stock: boolean
  auto_reprice: boolean
  last_sync_at?: string | null
  sync_cron?: string
  provider_currency?: string
}

const INTERVAL_OPTIONS = [
  { value: 15, label: 'Her 15 dakikada' },
  { value: 60, label: 'Her saat' },
  { value: 180, label: 'Her 3 saatte' },
  { value: 360, label: 'Her 6 saatte' },
  { value: 720, label: 'Her 12 saatte' },
  { value: 1440, label: 'Günde bir' },
]

const defaultSettings: SyncSettings = {
  sync_interval_minutes: 360,
  sync_prices: true,
  sync_stock: true,
  sync_info: false,
  sync_new_products: false,
  sync_new_products_limit: 0,
  hide_on_zero_stock: true,
  auto_reprice: true,
  last_sync_at: null,
  sync_cron: '0 */6 * * *',
  provider_currency: 'eur',
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return value
  }
}

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  // Tam tarama: last_sync_at yok sayilir, katalog bastan cekilir (uzun surer).
  const [fullScan, setFullScan] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [settings, setSettings] = useState<SyncSettings>(defaultSettings)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const response = await adminApi.get('/admin/sync-logs', { params: { limit: 20 } })
      const nextLogs: SyncLog[] = response.data?.logs || []
      setLogs(nextLogs)
      return nextLogs
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch logs:', error)
      setLogs([])
      return []
    } finally {
      setLogsLoading(false)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const res = await adminApi.get('/admin/kinguin/settings')
      const s = res.data || {}
      setSettings({
        sync_interval_minutes: Number(s.sync_interval_minutes) || 360,
        sync_prices: s.sync_prices !== false,
        sync_stock: s.sync_stock !== false,
        sync_info: s.sync_info === true,
        sync_new_products: s.sync_new_products === true,
        sync_new_products_limit: Number(s.sync_new_products_limit ?? 0),
        hide_on_zero_stock: s.hide_on_zero_stock !== false,
        auto_reprice: s.auto_reprice !== false,
        last_sync_at: s.last_sync_at || null,
        sync_cron: s.sync_cron || '0 */6 * * *',
        provider_currency: s.provider_currency || 'eur',
      })
    } catch (error: any) {
      setSettingsMessage({
        ok: false,
        text: error?.response?.data?.message || 'Senkronizasyon ayarları yüklenemedi',
      })
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    fetchSettings()
  }, [fetchLogs, fetchSettings])

  // Arka planda baslayan senkronu log uzerinden izle
  useEffect(() => {
    const hasRunning = logs.some((l) => l.status === 'running')
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const next = await fetchLogs()
        if (!next.some((l) => l.status === 'running')) {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
          setSyncing(false)
          const last = next[0]
          setResult({
            success: last?.status === 'success',
            message:
              last?.status === 'success'
                ? `✅ Senkronizasyon tamamlandı — ${last.details || ''}`
                : last?.status === 'canceled'
                  ? `⏹️ Senkronizasyon iptal edildi — ${last.details || ''}`
                  : `❌ Senkronizasyon başarısız: ${last?.details || 'bilinmeyen hata'}`,
          })
          fetchSettings()
        }
      }, 5000)
    }
    return () => {
      if (!hasRunning && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, fetchLogs])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleManualSync = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const response = await adminApi.post('/admin/products/sync', {
        type: 'full',
        full_scan: fullScan,
      })
      setResult({
        success: true,
        message: response.data?.message || '✅ Senkronizasyon başlatıldı',
      })
      await fetchLogs()
    } catch (error: any) {
      const status = error?.response?.status
      setResult({
        success: false,
        message:
          status === 409
            ? 'Zaten çalışan bir senkronizasyon var'
            : error?.response?.data?.message || 'Senkronizasyon başlatılamadı',
      })
      setSyncing(false)
    }
  }

  const cancelSync = async (id: string) => {
    if (!window.confirm('Bu senkronizasyonu iptal etmek istiyor musunuz?')) return
    try {
      await adminApi.post(`/admin/kinguin/sync-logs/${id}/cancel`)
      setResult({ success: true, message: '⏹️ Senkronizasyon iptal edildi' })
      setSyncing(false)
      await fetchLogs()
    } catch (error: any) {
      setResult({
        success: false,
        message: error?.response?.data?.message || 'İptal edilemedi',
      })
    }
  }

  const saveSettings = async () => {    setSavingSettings(true)
    setSettingsMessage(null)
    try {
      await adminApi.post('/admin/kinguin/settings', {
        sync_interval_minutes: Number(settings.sync_interval_minutes),
        sync_prices: settings.sync_prices,
        sync_stock: settings.sync_stock,
        sync_info: settings.sync_info,
        sync_new_products: settings.sync_new_products,
        sync_new_products_limit: Number(settings.sync_new_products_limit || 0),
        hide_on_zero_stock: settings.hide_on_zero_stock,
        auto_reprice: settings.auto_reprice,
      })
      setSettingsMessage({ ok: true, text: 'Senkronizasyon ayarları kaydedildi.' })
      await fetchSettings()
    } catch (error: any) {
      setSettingsMessage({
        ok: false,
        text: error?.response?.data?.message || 'Ayarlar kaydedilemedi',
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const lastSuccessful = logs.find((l) => l.status === 'success')

  const nextSyncText = useMemo(() => {
    if (!settings.last_sync_at) return 'İlk senkronizasyon bekleniyor'
    const last = new Date(settings.last_sync_at).getTime()
    if (!Number.isFinite(last)) return '-'
    const next = last + Number(settings.sync_interval_minutes || 360) * 60000
    if (next <= Date.now()) return 'Şimdi çalışabilir'
    return new Date(next).toLocaleString('tr-TR')
  }, [settings.last_sync_at, settings.sync_interval_minutes])

  const toggle = (key: keyof SyncSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-white">
              ← Geri
            </Link>
            <div>
              <h1 className="text-3xl font-black text-white">🔄 Ürün Senkronizasyonu</h1>
              <p className="text-gray-400">Kaynak: Kinguin API · fiyat, stok ve ürün bilgisi</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {result && (
          <div
            className={`${
              result.success
                ? 'bg-green-500/10 border-green-500 text-green-500'
                : 'bg-red-500/10 border-red-500 text-red-500'
            } border px-4 py-3 rounded-lg mb-6`}
          >
            {result.message}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Manual Sync */}
          <div className="gaming-card p-6">
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-xl font-bold text-white mb-2">Manuel Senkronizasyon</h2>
            <p className="text-gray-400 text-sm mb-6">
              Kinguin’deki güncel fiyat ve stok bilgilerini şimdi çek
            </p>
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50"
            >
              {syncing ? '⏳ Senkronize ediliyor...' : '🔄 Şimdi Senkronize Et'}
            </button>
            {syncing && (
              <p className="text-xs text-gray-500 mt-3">
                Senkronizasyon arka planda çalışıyor; kayıtlar birkaç saniyede bir yenilenir.
              </p>
            )}
            <label className="flex items-start gap-2 mt-4 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={fullScan}
                onChange={() => setFullScan((v) => !v)}
                disabled={syncing}
                className="mt-0.5 w-4 h-4 rounded"
              />
              <span>
                <span className="text-white font-medium">Tam tarama</span> — tüm katalog
                baştan çekilir (≈134 bin kayıt, ~30 dk). Kapalıyken yalnızca son senkron
                sonrası değişenler gelir.
              </span>
            </label>
          </div>

          {/* Scheduled Sync */}
          <div className="gaming-card p-6">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-bold text-white mb-2">Otomatik Senkronizasyon</h2>
            <p className="text-gray-400 text-sm mb-4">Zamanlı görev ile otomatik güncelleme</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#1a1d24] rounded-lg">
                <span className="text-sm text-gray-400">Kaynak:</span>
                <span className="text-[#ff6b35] font-bold">Kinguin API</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1a1d24] rounded-lg">
                <span className="text-sm text-gray-400">Sıklık:</span>
                <span className="text-white font-bold">
                  {INTERVAL_OPTIONS.find((o) => o.value === settings.sync_interval_minutes)?.label ||
                    `Her ${settings.sync_interval_minutes} dakikada`}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1a1d24] rounded-lg">
                <span className="text-sm text-gray-400">Son Senkron:</span>
                <span className="text-white text-sm">{formatDateTime(settings.last_sync_at)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1a1d24] rounded-lg">
                <span className="text-sm text-gray-400">Sonraki:</span>
                <span className="text-white text-sm">{nextSyncText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Editable Settings */}
        <div className="gaming-card p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">⚙️ Senkronizasyon Ayarları</h2>
              <p className="text-gray-400 text-sm">
                Hangi verilerin Kinguin’den çekileceğini ve sıklığını belirleyin.
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-[#ff6b35]/15 border border-[#ff6b35]/40 text-[#ff6b35] font-bold">
              Kaynak: Kinguin
            </span>
          </div>

          {settingsMessage && (
            <div
              className={`border px-4 py-3 rounded-lg text-sm mb-4 ${
                settingsMessage.ok
                  ? 'bg-green-500/10 border-green-500/40 text-green-400'
                  : 'bg-red-500/10 border-red-500/40 text-red-400'
              }`}
            >
              {settingsMessage.text}
            </div>
          )}

          {settingsLoading ? (
            <div className="py-6 text-center text-gray-400">Ayarlar yükleniyor…</div>
          ) : (
            <div className="space-y-5">
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Senkron sıklığı
                </label>
                <select
                  value={settings.sync_interval_minutes}
                  onChange={(e) =>
                    setSettings({ ...settings, sync_interval_minutes: Number(e.target.value) })
                  }
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Zamanlayıcı 15 dakikada bir kontrol eder; gerçek çalışma bu aralığa göre yapılır.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { key: 'sync_prices' as const, label: 'Fiyatları senkronize et', desc: 'Kinguin satış fiyatlarını güncelle' },
                  { key: 'sync_stock' as const, label: 'Stokları senkronize et', desc: 'Stok durumunu güncelle' },
                  { key: 'sync_info' as const, label: 'Ürün bilgilerini güncelle', desc: 'Ad, açıklama ve görseller' },
                  { key: 'sync_new_products' as const, label: 'Yeni ürünleri içe aktar', desc: 'Katalogda olmayan ürünleri ekle' },
                  { key: 'hide_on_zero_stock' as const, label: 'Sıfır stokta gizle', desc: 'Stok yoksa ürünü pasife al' },
                  { key: 'auto_reprice' as const, label: 'Otomatik fiyatlandırma', desc: 'Marj kurallarını uygula' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-3 p-3 bg-[#1a1d24] border border-gray-800 rounded-lg cursor-pointer hover:border-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(settings[item.key])}
                      onChange={() => toggle(item.key)}
                      className="w-5 h-5 mt-0.5 rounded"
                    />
                    <span>
                      <span className="block text-sm text-white font-medium">{item.label}</span>
                      <span className="block text-xs text-gray-500">{item.desc}</span>
                    </span>
                  </label>
                ))}
              </div>

              {settings.sync_new_products && (
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Senkron başına listelenecek yeni ürün
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settings.sync_new_products_limit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sync_new_products_limit: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    <b className="text-white">0 = sınırsız</b> — senkron, katalogda listelenmemiş
                    ürün kalmayana kadar mağazaya ekler (uzun sürebilir). Örn. 500 → her senkronda
                    en fazla 500 yeni ürün.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="px-6 py-3 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {savingSettings ? 'Kaydediliyor…' : '💾 Ayarları Kaydet'}
                </button>
                <button
                  onClick={fetchSettings}
                  disabled={savingSettings}
                  className="px-4 py-3 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] disabled:opacity-50"
                >
                  Geri Al
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sync Logs */}
        <div className="gaming-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">📋 Senkronizasyon Geçmişi</h2>
            <button
              onClick={fetchLogs}
              className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg text-sm hover:border-[#ff6b35] transition"
            >
              Yenile
            </button>
          </div>

          {logsLoading ? (
            <div className="py-12 text-center text-gray-400">Yükleniyor…</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-400">Henüz log kaydı yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded bg-[#ff6b35]/15 border border-[#ff6b35]/40 text-[#ff6b35] font-bold">
                          {log.provider_label || 'Kinguin'}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300">
                          {log.type_label || log.type || 'Senkron'}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            log.status === 'success'
                              ? 'bg-green-500/20 text-green-500'
                              : log.status === 'running'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : log.status === 'stalled'
                                  ? 'bg-orange-500/20 text-orange-400'
                                  : log.status === 'canceled'
                                    ? 'bg-gray-500/20 text-gray-300'
                                    : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {log.status === 'success'
                            ? '✅ Başarılı'
                            : log.status === 'running'
                              ? '⏳ Çalışıyor'
                              : log.status === 'stalled'
                                ? '⏸️ Takıldı'
                                : log.status === 'canceled'
                                  ? '⏹️ İptal edildi'
                                  : '❌ Hatalı'}
                        </span>
                        <span className="text-sm text-gray-400">{log.timestamp}</span>
                        {log.can_cancel && (
                          <button
                            onClick={() => cancelSync(log.id)}
                            className="text-xs px-2 py-1 rounded bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25"
                          >
                            İptal
                          </button>
                        )}
                      </div>
                      <p className="text-white text-sm">{log.message || 'Senkronizasyon'}</p>
                      {log.details && <p className="text-xs text-gray-500 mt-1">{log.details}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 gaming-card p-6 bg-purple-500/5 border-purple-500/20">
          <h3 className="text-lg font-bold text-white mb-3">ℹ️ Bu sayfa ne yapar?</h3>
          <div className="text-sm text-gray-400 space-y-2">
            <p>• Ürün fiyat ve stokları <span className="text-white">Kinguin API</span> üzerinden çekilir.</p>
            <p>• Otomatik senkron seçilen sıklıkta çalışır; manuel senkron her zaman tetiklenebilir.</p>
            <p>• Her çalışma kaynağı ve türüyle birlikte geçmişe kaydedilir.</p>
            <p>• Fiyat değişiklikleri marj kurallarına göre uygulanır; büyük değişimler onaya düşebilir.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
