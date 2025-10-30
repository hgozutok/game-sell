'use client'

import Link from 'next/link'
import { useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const adminSections = [
  {
    title: 'Mağaza Ayarları',
    icon: '⚙️',
    description: 'Site başlığı, logo, renkler',
    href: '/admin/dashboard/settings',
    color: 'from-blue-600 to-cyan-600',
    features: ['Site Bilgileri', 'Tema Ayarları', 'SEO']
  },
  {
    title: 'Slider Yönetimi',
    icon: '🖼️',
    description: 'Ana sayfa slider düzenle',
    href: '/admin/dashboard/slider',
    color: 'from-purple-600 to-pink-600',
    features: ['Banner Ekle', 'Sıralama', 'Aktif/Pasif']
  },
  {
    title: 'Ürün İçe Aktarma',
    icon: '📦',
    description: 'CWS/Kinguin ürün getir',
    href: '/admin/dashboard/products/import',
    color: 'from-orange-600 to-red-600',
    features: ['API Entegrasyon', 'Toplu İçe Aktar', 'Fiyat Marjı']
  },
  {
    title: 'Fiyatlandırma',
    icon: '💰',
    description: 'Kategori bazlı marj ayarları',
    href: '/admin/dashboard/pricing',
    color: 'from-green-600 to-emerald-600',
    features: ['Kar Marjı', 'Kategori Bazlı', 'Otomatik Güncelleme']
  },
  {
    title: 'Para Birimleri',
    icon: '💱',
    description: 'Döviz kurları ve ayarlar',
    href: '/admin/dashboard/currency-rates',
    color: 'from-yellow-600 to-amber-600',
    features: ['Canlı Kur', 'Manuel Güncelleme', 'Multi-Currency']
  },
  {
    title: 'Ürün Senkronizasyonu',
    icon: '🔄',
    description: 'Otomatik stok/fiyat güncelleme',
    href: '/admin/dashboard/sync',
    color: 'from-indigo-600 to-purple-600',
    features: ['Zamanlı Sync', 'Manuel Sync', 'Log Görüntüle']
  },
]

export default function AdminDashboard() {
  const [stats] = useState({
    totalProducts: 11,
    totalOrders: 0,
    totalCustomers: 1,
    revenue: 0
  })
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const handleSyncCollections = async () => {
    setSyncLoading(true)
    setSyncResult(null)
    try {
      const res = await adminApi.post('/admin/products/sync-collections')
      const processed = res.data?.processed ?? 0
      const updated = res.data?.updated ?? 0
      setSyncResult(`Processed ${processed}, updated ${updated}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to sync'
      setSyncResult(`Error: ${msg}`)
      // eslint-disable-next-line no-console
      console.error('Sync collections error:', err?.response?.data || err?.message)
    } finally {
      setSyncLoading(false)
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
                🛡️ Admin Dashboard
              </h1>
              <p className="text-gray-400">Mağaza yönetim paneli</p>
            </div>
            <Link 
              href="/"
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
            >
              ← Mağazaya Dön
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-black text-[#ff6b35] mb-1">{stats.totalProducts}</div>
            <div className="text-xs text-gray-500 uppercase">Toplam Ürün</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-black text-green-500 mb-1">{stats.totalOrders}</div>
            <div className="text-xs text-gray-500 uppercase">Siparişler</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-black text-blue-500 mb-1">{stats.totalCustomers}</div>
            <div className="text-xs text-gray-500 uppercase">Müşteriler</div>
          </div>
          <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
            <div className="text-3xl font-black text-purple-500 mb-1">${stats.revenue}</div>
            <div className="text-xs text-gray-500 uppercase">Gelir</div>
          </div>
        </div>

        {/* Management Sections */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-4">Yönetim Paneli</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => (
              <Link
                key={section.title}
                href={section.href}
                className="group"
              >
                <div className="gaming-card hover:scale-105 transition-transform">
                  <div className={`h-2 bg-gradient-to-r ${section.color}`}></div>
                  <div className="p-6">
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                      {section.icon}
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 group-hover:text-[#ff6b35] transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">{section.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {section.features.map((feature) => (
                        <span
                          key={feature}
                          className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="gaming-card p-6">
          <h3 className="text-xl font-black text-white mb-4">Hızlı Erişim</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="http://localhost:9000/app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-[#1a1d24] rounded-lg hover:bg-[#ff6b35] transition group"
            >
              <span className="text-2xl">🔧</span>
              <div>
                <div className="font-bold text-white group-hover:text-white">Medusa Admin Panel</div>
                <div className="text-xs text-gray-400">Backend yönetim paneli</div>
              </div>
            </a>
            <Link
              href="/products"
              className="flex items-center gap-3 p-4 bg-[#1a1d24] rounded-lg hover:bg-[#ff6b35] transition group"
            >
              <span className="text-2xl">🛍️</span>
              <div>
                <div className="font-bold text-white">Ürünleri Görüntüle</div>
                <div className="text-xs text-gray-400">Tüm ürünler</div>
              </div>
            </Link>
            <button
              onClick={handleSyncCollections}
              disabled={syncLoading}
              className="flex items-center gap-3 p-4 bg-[#1a1d24] rounded-lg border border-gray-700 hover:border-[#ff6b35] transition group disabled:opacity-60"
            >
              <span className="text-2xl">📚</span>
              <div className="text-left">
                <div className="font-bold text-white">Sync Collections</div>
                <div className="text-xs text-gray-400">
                  {syncLoading ? 'Running…' : 'Ürünleri koleksiyonlarla eşle'}
                </div>
              </div>
            </button>
          </div>
          {syncResult && (
            <div className="mt-4 text-sm text-gray-300">
              {syncResult}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

