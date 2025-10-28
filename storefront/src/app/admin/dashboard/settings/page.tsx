'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { adminApi } from '@/lib/admin-api'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    store_name: 'Digital Game Store',
    store_description: 'Your trusted source for digital game keys',
    support_email: 'support@digitalgamestore.com',
    currency: 'USD',
    tax_rate: 0,
    enable_wishlist: true,
    enable_reviews: true,
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/store/settings')
        console.log('Settings response:', response.data)
        
        // Backend returns { store: {...}, currencies: {...}, theme: {...} }
        // We need to adapt it to our format
        if (response.data) {
          setSettings({
            store_name: response.data.store?.name || 'Digital Game Store',
            store_description: response.data.store?.description || '',
            support_email: response.data.store?.support_email || 'support@digitalgamestore.com',
            currency: response.data.currencies?.default || 'USD',
            tax_rate: response.data.store?.tax_rate || 0,
            enable_wishlist: response.data.store?.enable_wishlist !== false,
            enable_reviews: response.data.store?.enable_reviews !== false,
          })
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        // Continue with default settings if fetch fails
      }
    }
    fetchSettings()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)

    try {
      // Save each setting individually using the backend format
      const settingsToSave = [
        { key: 'store.name', value: settings.store_name, category: 'store' },
        { key: 'store.description', value: settings.store_description, category: 'store' },
        { key: 'store.support_email', value: settings.support_email, category: 'store' },
        { key: 'currencies.default', value: settings.currency, category: 'currencies' },
        { key: 'store.tax_rate', value: settings.tax_rate, category: 'store' },
        { key: 'store.enable_wishlist', value: settings.enable_wishlist, category: 'store' },
        { key: 'store.enable_reviews', value: settings.enable_reviews, category: 'store' },
      ]

      for (const setting of settingsToSave) {
        await adminApi.post('/admin/settings', setting)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Ayarlar kaydedilirken hata oluştu. Backend çalışıyor mu?')
    } finally {
      setLoading(false)
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
              <h1 className="text-3xl font-black text-white">⚙️ Mağaza Ayarları</h1>
              <p className="text-gray-400">Site bilgileri ve genel ayarlar</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg mb-6">
            ✅ Ayarlar başarıyla kaydedildi!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Info */}
          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-4">Mağaza Bilgileri</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mağaza Adı
                </label>
                <input
                  type="text"
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={settings.store_description}
                  onChange={(e) => setSettings({ ...settings, store_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Destek Email
                </label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Currency & Tax */}
          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-4">Para Birimi & Vergi</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Varsayılan Para Birimi
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vergi Oranı (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-4">Özellikler</h2>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_wishlist}
                  onChange={(e) => setSettings({ ...settings, enable_wishlist: e.target.checked })}
                  className="w-5 h-5 bg-[#1a1d24] border border-gray-700 rounded text-[#ff6b35] focus:ring-[#ff6b35]"
                />
                <div>
                  <div className="text-white font-medium">Favoriler Listesi</div>
                  <div className="text-sm text-gray-400">Müşterilerin ürünleri favorilere eklemesine izin ver</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enable_reviews}
                  onChange={(e) => setSettings({ ...settings, enable_reviews: e.target.checked })}
                  className="w-5 h-5 bg-[#1a1d24] border border-gray-700 rounded text-[#ff6b35] focus:ring-[#ff6b35]"
                />
                <div>
                  <div className="text-white font-medium">Ürün Yorumları</div>
                  <div className="text-sm text-gray-400">Müşterilerin ürün yorumu yapmasına izin ver</div>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold hover:shadow-2xl hover:shadow-[#ff6b35]/50 transition-all disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : '💾 Ayarları Kaydet'}
            </button>
            <Link
              href="/admin/dashboard"
              className="px-6 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition text-center"
            >
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

