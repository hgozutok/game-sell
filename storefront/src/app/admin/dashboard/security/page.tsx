'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type BlockedIpEntry = {
  ip: string
  reason: string
  source: 'manual' | 'auto'
  created_at: string
  expires_at: string | null
  hits?: number
}

type AutoBlockConfig = {
  enabled: boolean
  threshold: number
  windowMinutes: number
  blockHours: number
}

type Payload = {
  blocked: BlockedIpEntry[]
  whitelist: string[]
  config: AutoBlockConfig
  your_ip?: string
  your_ip_blocked?: boolean
}

function date(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('tr-TR')
  } catch {
    return value
  }
}

export default function AdminSecurityPage() {
  const [payload, setPayload] = useState<Payload>({
    blocked: [],
    whitelist: [],
    config: { enabled: true, threshold: 20, windowMinutes: 10, blockHours: 24 },
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const [newIp, setNewIp] = useState('')
  const [newReason, setNewReason] = useState('')
  const [permanent, setPermanent] = useState(true)
  const [newWhitelistIp, setNewWhitelistIp] = useState('')

  // Ayar formu (backend dakika/saat alanlariyla konusur)
  const [cfgEnabled, setCfgEnabled] = useState(true)
  const [cfgThreshold, setCfgThreshold] = useState(20)
  const [cfgWindow, setCfgWindow] = useState(10)
  const [cfgHours, setCfgHours] = useState(24)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.get('/admin/ip-blocklist')
      const data: Payload = res.data
      setPayload(data)
      setCfgEnabled(data.config.enabled)
      setCfgThreshold(data.config.threshold)
      setCfgWindow(data.config.windowMinutes)
      setCfgHours(data.config.blockHours)
    } catch (e: any) {
      setMessage({ ok: false, text: e?.response?.data?.message || 'Güvenlik verileri yüklenemedi' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (fn: () => Promise<any>, okText: string) => {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fn()
      if (res?.data?.blocked) setPayload((p) => ({ ...p, blocked: res.data.blocked }))
      if (res?.data?.whitelist) setPayload((p) => ({ ...p, whitelist: res.data.whitelist }))
      if (res?.data?.config) setPayload((p) => ({ ...p, config: res.data.config }))
      setMessage({ ok: true, text: okText })
    } catch (e: any) {
      setMessage({ ok: false, text: e?.response?.data?.message || 'İşlem başarısız' })
    } finally {
      setBusy(false)
    }
  }

  const blockIp = () =>
    act(
      () =>
        adminApi.post('/admin/ip-blocklist', {
          ip: newIp.trim(),
          reason: newReason.trim() || undefined,
          permanent,
        }),
      `${newIp.trim()} engellendi.`
    ).then(() => {
      setNewIp('')
      setNewReason('')
    })

  const unblock = (ip: string) => {
    if (!window.confirm(`${ip} engeli kaldırılsın mı?`)) return
    return act(() => adminApi.post('/admin/ip-blocklist', { unblock: ip }), `${ip} engeli kaldırıldı.`)
  }

  const addWhitelist = () =>
    act(
      () => adminApi.post('/admin/ip-blocklist', { whitelist: newWhitelistIp.trim() }),
      `${newWhitelistIp.trim()} beyaz listeye eklendi (asla otomatik engellenmez).`
    ).then(() => setNewWhitelistIp(''))

  const removeWhitelist = (ip: string) =>
    act(
      () => adminApi.post('/admin/ip-blocklist', { remove_whitelist: ip }),
      `${ip} beyaz listeden çıkarıldı.`
    )

  const saveConfig = () =>
    act(
      () =>
        adminApi.post('/admin/ip-blocklist', {
          config: {
            enabled: cfgEnabled,
            threshold: cfgThreshold,
            window_minutes: cfgWindow,
            block_hours: cfgHours,
          },
        }),
      'Otomatik blok ayarları kaydedildi.'
    )

  const autoBlocked = payload.blocked.filter((e) => e.source === 'auto')
  const manualBlocked = payload.blocked.filter((e) => e.source === 'manual')

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">🛡️ Güvenlik — IP Engel Listesi</h1>
            <p className="text-gray-400">
              Bot/tarayıcı IP&apos;lerini otomatik engelleme ve manuel yönetim
            </p>
          </div>
          <div className="text-right">
            {payload.your_ip && (
              <p className="text-xs text-gray-500 mb-2">
                Sunucunun algıladığınız IP:{" "}
                <span className="font-mono text-gray-300">{payload.your_ip}</span>
                {payload.your_ip_blocked ? (
                  <span className="ms-2 text-red-400">(engelli!)</span>
                ) : (
                  <span className="ms-2 text-green-500/70">(engelli değil)</span>
                )}
              </p>
            )}
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
            >
              ← Dashboard
            </Link>
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

        {/* Ozet */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Engelli IP</div>
            <div className="text-3xl font-black text-red-400">{payload.blocked.length}</div>
            <div className="text-xs text-gray-500 mt-1">{autoBlocked.length} otomatik · {manualBlocked.length} manuel</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Otomatik Blok</div>
            <div className={`text-3xl font-black ${payload.config.enabled ? 'text-green-400' : 'text-gray-500'}`}>
              {payload.config.enabled ? 'Açık' : 'Kapalı'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {payload.config.windowMinutes} dk&apos;da {payload.config.threshold} şüpheli istek
            </div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Blok Süresi</div>
            <div className="text-3xl font-black text-white">
              {payload.config.blockHours === 0 ? '∞' : `${payload.config.blockHours} sa`}
            </div>
            <div className="text-xs text-gray-500 mt-1">otomatik bloklar</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Beyaz Liste</div>
            <div className="text-3xl font-black text-white">{payload.whitelist.length}</div>
            <div className="text-xs text-gray-500 mt-1">asla engellenmez</div>
          </div>
        </div>

        {/* Otomatik blok ayarlari */}
        <div className="bg-[#15171c] border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">⚙️ Otomatik Blok Ayarları</h2>
            <p className="text-xs text-gray-400 mt-1">
              Bir IP, pencere içinde eşik kadar 404/403/429 yanıtı tetiklerse otomatik engellenir.
              İç ağ adresleri (docker, localhost) hiçbir zaman engellenmez.
            </p>
          </div>
          <div className="px-6 py-5 flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={cfgEnabled}
                onChange={(e) => setCfgEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#ff6b35]"
              />
              Otomatik blok açık
            </label>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Eşik (şüpheli istek)</label>
              <input
                type="number"
                min={3}
                value={cfgThreshold}
                onChange={(e) => setCfgThreshold(Number(e.target.value))}
                className="w-24 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Pencere (dakika)</label>
              <input
                type="number"
                min={1}
                value={cfgWindow}
                onChange={(e) => setCfgWindow(Number(e.target.value))}
                className="w-24 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Blok süresi (saat, 0 = süresiz)</label>
              <input
                type="number"
                min={0}
                value={cfgHours}
                onChange={(e) => setCfgHours(Number(e.target.value))}
                className="w-28 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <button
              type="button"
              onClick={saveConfig}
              disabled={busy}
              className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
            >
              Kaydet
            </button>
          </div>
        </div>

        {/* Manuel engelleme + beyaz liste */}
        <div className="bg-[#15171c] border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">✍️ Manuel İşlemler</h2>
          </div>
          <div className="px-6 py-5 grid md:grid-cols-2 gap-8">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">IP Engelle</div>
              <div className="flex gap-2 mb-2">
                <input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="154.36.176.38"
                  className="flex-1 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm placeholder:text-gray-500"
                />
              </div>
              <input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Sebep (ör. vuln scanner)"
                className="w-full bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm mb-2 placeholder:text-gray-500"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-gray-400">
                  <input
                    type="checkbox"
                    checked={permanent}
                    onChange={(e) => setPermanent(e.target.checked)}
                    className="w-4 h-4 accent-[#ff6b35]"
                  />
                  Süresiz (işareti kaldırırsan 24 saat)
                </label>
                <button
                  type="button"
                  onClick={blockIp}
                  disabled={busy || !newIp.trim()}
                  className="px-3 py-2 bg-red-500/20 border border-red-500/40 text-red-300 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition disabled:opacity-40"
                >
                  Engelle
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                Beyaz Liste (kendi IP&apos;iniz için)
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  value={newWhitelistIp}
                  onChange={(e) => setNewWhitelistIp(e.target.value)}
                  placeholder="85.98.45.70"
                  className="flex-1 bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={addWhitelist}
                  disabled={busy || !newWhitelistIp.trim()}
                  className="px-3 py-2 bg-[#ff6b35] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-40"
                >
                  Ekle
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {payload.whitelist.length === 0 ? (
                  <span className="text-xs text-gray-500">Kayıt yok</span>
                ) : (
                  payload.whitelist.map((ip) => (
                    <span
                      key={ip}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-xs"
                    >
                      {ip}
                      <button
                        type="button"
                        onClick={() => removeWhitelist(ip)}
                        disabled={busy}
                        className="text-green-400 hover:text-white transition disabled:opacity-40"
                        title="Beyaz listeden çıkar"
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Engelli IP listesi */}
        <div className="bg-[#15171c] border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">⛔ Engelli IP&apos;ler ({payload.blocked.length})</h2>
            <button
              type="button"
              onClick={load}
              className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition text-sm"
            >
              Yenile
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400">Yükleniyor…</div>
          ) : payload.blocked.length === 0 ? (
            <div className="py-16 text-center text-gray-400">Engelli IP yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">Kaynak</th>
                    <th className="px-4 py-3">Sebep</th>
                    <th className="px-4 py-3 text-right">İstek</th>
                    <th className="px-4 py-3">Engellenme</th>
                    <th className="px-4 py-3">Bitiş</th>
                    <th className="px-4 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.blocked.map((entry) => (
                    <tr key={entry.ip} className="border-t border-gray-800 text-gray-200">
                      <td className="px-4 py-3 font-mono font-semibold text-white">{entry.ip}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            entry.source === 'auto'
                              ? 'bg-orange-500/15 text-orange-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {entry.source === 'auto' ? 'Otomatik' : 'Manuel'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate" title={entry.reason}>
                        {entry.reason}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{entry.hits ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">{date(entry.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                        {entry.expires_at ? date(entry.expires_at) : 'Süresiz'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => unblock(entry.ip)}
                          disabled={busy}
                          className="px-3 py-2 rounded-lg text-xs border bg-green-500/10 border-green-500/40 text-green-400 hover:bg-green-500/20 transition disabled:opacity-50"
                        >
                          Engeli Kaldır
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Otomatik blok, tarayıcıların (vuln scanner) 404/403/429 istek desenini izler: eşik aşılırsa IP
          buraya düşer ve anında 403 alır. Kendi IP&apos;niz eşik üstüne çıkarsa (ör. toplu sayfa
          yenileme) beyaz listeye ekleyin; engeller buradan veya &quot;Engeli Kaldır&quot; ile açılır.
        </p>
      </div>
    </div>
  )
}
