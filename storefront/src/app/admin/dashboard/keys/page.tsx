'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

interface Key {
  id: string
  key_code: string
  product_id: string
  product_title?: string
  status: 'available' | 'assigned' | 'delivered' | 'revoked'
  platform?: string
  region?: string
  provider?: string
  created_at: string
  assigned_at?: string
  delivered_at?: string
}

export default function KeysPage() {
  const [keys, setKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: 'all',
    provider: 'all',
  })

  const fetchKeys = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (filters.status !== 'all') {
        params.status = filters.status
      }
      if (filters.provider !== 'all') {
        params.provider = filters.provider
      }

      console.log('Fetching keys with params:', params)
      const response = await adminApi.get('/admin/digital-keys', { params })
      console.log('Keys response:', response.data)
      setKeys(response.data.digital_keys || [])
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to load keys'
      setError(errorMsg)
      console.error('Keys fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [filters])

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Bu anahtarı iptal etmek istediğinize emin misiniz?')) {
      return
    }

    try {
      await adminApi.delete(`/admin/digital-keys/${keyId}`)
      fetchKeys()
    } catch (err: any) {
      alert('Anahtar iptal edilirken hata oluştu: ' + (err?.response?.data?.message || err.message))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500/20 text-green-500'
      case 'assigned':
        return 'bg-yellow-500/20 text-yellow-500'
      case 'delivered':
        return 'bg-blue-500/20 text-blue-500'
      case 'revoked':
        return 'bg-red-500/20 text-red-500'
      default:
        return 'bg-gray-500/20 text-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                🔑 Anahtar Yönetimi
              </h1>
              <p className="text-gray-400">Dijital anahtarları görüntüle ve yönet</p>
            </div>
            <Link 
              href="/admin/dashboard"
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
            >
              ← Geri
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="gaming-card p-6 mb-6">
          <h2 className="text-xl font-black text-white mb-4">Filtreler</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Durum</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
              >
                <option value="all">Tümü</option>
                <option value="available">Mevcut</option>
                <option value="assigned">Atanmış</option>
                <option value="delivered">Teslim Edilmiş</option>
                <option value="revoked">İptal Edilmiş</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Sağlayıcı</label>
              <select
                value={filters.provider}
                onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
                className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
              >
                <option value="all">Tümü</option>
                <option value="codeswholesale">CodesWholesale</option>
                <option value="kinguin">Kinguin</option>
                <option value="manual">Manuel</option>
              </select>
            </div>
          </div>
        </div>

        {/* Keys Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-bold text-white mb-2">{error}</h3>
            <button
              onClick={fetchKeys}
              className="btn-primary mt-4"
            >
              Tekrar Dene
            </button>
          </div>
        ) : (
          <div className="gaming-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-white">
                Anahtarlar ({keys.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Anahtar</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Ürün</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Durum</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Platform</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Sağlayıcı</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Oluşturma</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className="border-b border-gray-800 hover:bg-gray-800/20">
                      <td className="py-3 px-4">
                        <code className="text-white font-mono text-sm">
                          {key.key_code}
                        </code>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white text-sm">
                          {key.product_title || key.product_id}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusColor(key.status)}`}>
                          {key.status === 'available' ? 'Mevcut' : 
                           key.status === 'assigned' ? 'Atanmış' :
                           key.status === 'delivered' ? 'Teslim Edilmiş' : 'İptal Edilmiş'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-400 text-sm">
                          {key.platform || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-400 text-sm">
                          {key.provider || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-400 text-sm">
                          {new Date(key.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {key.status === 'available' && (
                          <button
                            onClick={() => handleRevokeKey(key.id)}
                            className="px-3 py-1 bg-red-500/20 text-red-500 rounded text-sm hover:bg-red-500/30 transition"
                          >
                            İptal Et
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {keys.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔑</div>
                  <p className="text-gray-400">Henüz anahtar kaydı yok</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

