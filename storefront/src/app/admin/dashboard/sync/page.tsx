'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

type SyncLog = {
  id: string
  status: 'success' | 'failed' | 'running' | string
  timestamp: string
  message?: string
  details?: string
  items_total?: number
  items_added?: number
  items_updated?: number
  items_failed?: number
}

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLogs = useCallback(async () => {
    try {
      const response = await adminApi.get('/admin/sync-logs', { params: { limit: 10 } })
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

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

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
                : `❌ Senkronizasyon başarısız: ${last?.details || 'bilinmeyen hata'}`,
          })
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
      const response = await adminApi.post('/admin/products/sync')
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

  const lastSuccessful = logs.find((l) => l.status === 'success')

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
              <p className="text-gray-400">Kinguin fiyat ve stok güncelleme</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
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

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Manual Sync */}
          <div className="gaming-card p-6">
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-xl font-bold text-white mb-2">Manuel Senkronizasyon</h2>
            <p className="text-gray-400 text-sm mb-6">
              Tüm ürünlerin fiyat ve stok bilgilerini şimdi güncelle
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
          </div>

          {/* Scheduled Sync */}
          <div className="gaming-card p-6">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-bold text-white mb-2">Otomatik Senkronizasyon</h2>
            <p className="text-gray-400 text-sm mb-6">Zamanlı görev ile otomatik güncelleme</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#1a1d24] rounded-lg">
                <span className="text-sm text-gray-400">Durum:</span>
                <span className="text-green-500 font-bold">✅ Aktif</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1a1d24] rounded-lg">
                <span className="text-sm text-gray-400">Sıklık:</span>
                <span className="text-white font-bold">Her 6 saatte</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1a1d24] rounded-lg">
                <span className="text-sm text-gray-400">Son Başarılı:</span>
                <span className="text-white text-sm">{lastSuccessful?.timestamp || '-'}</span>
              </div>
            </div>
          </div>
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
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            log.status === 'success'
                              ? 'bg-green-500/20 text-green-500'
                              : log.status === 'running'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {log.status === 'success'
                            ? '✅ Başarılı'
                            : log.status === 'running'
                              ? '⏳ Çalışıyor'
                              : '❌ Hatalı'}
                        </span>
                        <span className="text-sm text-gray-400">{log.timestamp}</span>
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
          <h3 className="text-lg font-bold text-white mb-3">⚙️ Senkronizasyon Ayarları</h3>
          <div className="text-sm text-gray-400 space-y-2">
            <p>• Otomatik senkronizasyon her 6 saatte bir çalışır</p>
            <p>• Tüm ürünlerin fiyat ve stok durumu kontrol edilir</p>
            <p>• Değişiklikler otomatik olarak uygulanır</p>
            <p>• Manuel senkronizasyon istediğiniz zaman yapılabilir</p>
          </div>
        </div>
      </div>
    </div>
  )
}
