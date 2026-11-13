'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const adminSections = [
  {
    title: 'Ürün Yönetimi',
    icon: '📦',
    description: 'Ürünleri görüntüle, düzenle, filtrele',
    href: '/admin/dashboard/products',
    color: 'from-orange-600 to-red-600',
    features: ['Ürün Listesi', 'Filtreleme', 'Sayfalama'],
  },
  {
    title: 'Sipariş Kontrol',
    icon: '🧾',
    description: 'Siparişleri görüntüle, dijital teslimatı yönet',
    href: '/admin/dashboard/orders',
    color: 'from-emerald-600 to-green-600',
    features: ['Sipariş Listesi', 'Manuel Fulfillment', 'Otomatik Teslimat'],
  },
  {
    title: 'Anahtar Yönetimi',
    icon: '🔑',
    description: 'Dijital anahtarları yönet',
    href: '/admin/dashboard/keys',
    color: 'from-yellow-600 to-amber-600',
    features: ['Anahtar Listesi', 'Durum Yönetimi', 'İptal'],
  },
  {
    title: 'Kinguin',
    icon: '🎮',
    description: 'Bakiye, senkronizasyon ve fulfillment kuyruğu',
    href: '/admin/dashboard/kinguin',
    color: 'from-violet-600 to-purple-600',
    features: ['Bakiye', 'Sync Logları', 'Fiyat Onayları'],
  },
  {
    title: 'Ödeme Sistemleri',
    icon: '💳',
    description: 'Ödeme yöntemlerini yapılandır',
    href: '/admin/dashboard/payments',
    color: 'from-green-600 to-emerald-600',
    features: ['Stripe', 'PayPal', 'Havale'],
  },
  {
    title: 'Mağaza Ayarları',
    icon: '⚙️',
    description: 'Site başlığı, logo, renkler',
    href: '/admin/dashboard/settings',
    color: 'from-blue-600 to-cyan-600',
    features: ['Site Bilgileri', 'Tema Ayarları', 'SEO'],
  },
  {
    title: 'Slider Yönetimi',
    icon: '🖼️',
    description: 'Ana sayfa slider düzenle',
    href: '/admin/dashboard/slider',
    color: 'from-purple-600 to-pink-600',
    features: ['Banner Ekle', 'Sıralama', 'Aktif/Pasif'],
  },
  {
    title: 'Ürün İçe Aktarma',
    icon: '📥',
    description: 'Kinguin ürün getir',
    href: '/admin/dashboard/products/import',
    color: 'from-pink-600 to-rose-600',
    features: ['API Entegrasyon', 'Toplu İçe Aktar', 'Fiyat Marjı'],
  },
  {
    title: 'Fiyatlandırma',
    icon: '💰',
    description: 'Kategori bazlı marj ayarları',
    href: '/admin/dashboard/pricing',
    color: 'from-cyan-600 to-blue-600',
    features: ['Kar Marjı', 'Kategori Bazlı', 'Otomatik Güncelleme'],
  },
  {
    title: 'Para Birimleri',
    icon: '💱',
    description: 'Döviz kurları ve ayarlar',
    href: '/admin/dashboard/currency-rates',
    color: 'from-teal-600 to-green-600',
    features: ['Canlı Kur', 'Manuel Güncelleme', 'Multi-Currency'],
  },
  {
    title: 'Ürün Senkronizasyonu',
    icon: '🔄',
    description: 'Otomatik stok/fiyat güncelleme',
    href: '/admin/dashboard/sync',
    color: 'from-indigo-600 to-purple-600',
    features: ['Zamanlı Sync', 'Manuel Sync', 'Log Görüntüle'],
  },
]

type Stats = {
  products: number | null
  orders: number | null
  customers: number | null
  keys: number | null
  revenue: number | null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    products: null,
    orders: null,
    customers: null,
    keys: null,
    revenue: null,
  })
  const [statsError, setStatsError] = useState<string | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadStats = async () => {
      const [products, orders, customers, keys] = await Promise.allSettled([
        adminApi.get('/admin/products', { params: { limit: 1 } }),
        adminApi.get('/admin/orders', { params: { limit: 100 } }),
        adminApi.get('/admin/customers', { params: { limit: 1 } }),
        adminApi.get('/admin/digital-keys', { params: { limit: 1 } }),
      ])

      if (!active) return

      const orderList: any[] = orders.status === 'fulfilled' ? orders.value.data?.orders || [] : []
      // Medusa order.total minor birimde tutulur (kurus/cent).
      const revenue = orderList.reduce((sum, o) => sum + Number(o.total || 0), 0) / 100

      setStats({
        products:
          products.status === 'fulfilled' ? Number(products.value.data?.count ?? 0) : null,
        orders: orders.status === 'fulfilled' ? Number(orders.value.data?.count ?? 0) : null,
        customers:
          customers.status === 'fulfilled' ? Number(customers.value.data?.count ?? 0) : null,
        keys: keys.status === 'fulfilled' ? Number(keys.value.data?.count ?? 0) : null,
        revenue: orders.status === 'fulfilled' ? revenue : null,
      })

      const failed = [products, orders, customers, keys].find((r) => r.status === 'rejected')
      if (failed && failed.status === 'rejected') {
        const msg =
          failed.reason?.response?.data?.message || failed.reason?.message || 'İstatistikler yüklenemedi'
        setStatsError(String(msg))
      }
    }

    loadStats()
    return () => {
      active = false
    }
  }, [])

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

  const statCards = [
    { label: 'Toplam Ürün', value: stats.products, color: 'text-[#ff6b35]' },
    { label: 'Siparişler', value: stats.orders, color: 'text-green-500' },
    { label: 'Müşteriler', value: stats.customers, color: 'text-blue-500' },
    { label: 'Dijital Anahtar', value: stats.keys, color: 'text-amber-500' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">🛡️ Admin Dashboard</h1>
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
        {statsError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/40 text-red-400 px-4 py-3 rounded-lg text-sm">
            {statsError}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <div key={card.label} className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
              <div className={`text-3xl font-black mb-1 ${card.color}`}>
                {card.value === null ? '—' : card.value}
              </div>
              <div className="text-xs text-gray-500 uppercase">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500 uppercase">Toplam Gelir (son 100 sipariş)</div>
            <div className="text-3xl font-black text-purple-400">
              ${stats.revenue === null ? '—' : stats.revenue.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncCollections}
              disabled={syncLoading}
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-60"
            >
              {syncLoading ? 'Çalışıyor…' : '📚 Koleksiyonları Eşle'}
            </button>
            <Link
              href="/admin/dashboard/sync"
              className="px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition"
            >
              🔄 Senkronizasyon
            </Link>
          </div>
        </div>
        {syncResult && <div className="mb-6 text-sm text-gray-300">{syncResult}</div>}

        {/* Management Sections */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white mb-4">Yönetim Paneli</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => (
              <Link key={section.title} href={section.href} className="group">
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
          </div>
        </div>
      </div>
    </div>
  )
}
