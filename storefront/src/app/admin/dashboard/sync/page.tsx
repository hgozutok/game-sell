'use client'

import { useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

export default function SyncPage() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])

  const handleManualSync = async () => {
    setSyncing(true)
    setResult(null)

    try {
      const response = await adminApi.post('/admin/products/sync')
      setResult({
        success: true,
        message: `✅ ${response.data.updated_count} ürün güncellendi!`,
        ...response.data
      })
      fetchLogs()
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Senkronizasyon başarısız oldu'
      })
    } finally {
      setSyncing(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const response = await adminApi.get('/admin/sync-logs?limit=10')
      setLogs(response.data.logs || [])
    } catch (error) {
      console.error('Failed to fetch logs:', error)
      setLogs([])
    }
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
              <p className="text-gray-400">Fiyat ve stok güncelleme</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {result && (
          <div className={`${result.success ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500'} border px-4 py-3 rounded-lg mb-6`}>
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
              {syncing ? '⏳ Güncelleniyor...' : '🔄 Şimdi Senkronize Et'}
            </button>
          </div>

          {/* Scheduled Sync */}
          <div className="gaming-card p-6">
            <div className="text-4xl mb-4">⏰</div>
            <h2 className="text-xl font-bold text-white mb-2">Otomatik Senkronizasyon</h2>
            <p className="text-gray-400 text-sm mb-6">
              Zamanlı görev ile otomatik güncelleme
            </p>
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
                <span className="text-sm text-gray-400">Son Çalışma:</span>
                <span className="text-white text-sm">2 saat önce</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sync Logs */}
        <div className="gaming-card p-6">
          <h2 className="text-xl font-bold text-white mb-4">📋 Senkronizasyon Geçmişi</h2>
          
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-400">Henüz log kaydı yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={index} className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs px-2 py-1 rounded ${log.status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                          {log.status === 'success' ? '✅ Başarılı' : '❌ Hatalı'}
                        </span>
                        <span className="text-sm text-gray-400">{log.timestamp}</span>
                      </div>
                      <p className="text-white text-sm">{log.message}</p>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
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

