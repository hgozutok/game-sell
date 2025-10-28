'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

interface PricingRule {
  id?: string
  category: string
  margin_percentage: number
  min_price?: number
  max_price?: number
}

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [loading, setLoading] = useState(true)
  const [newRule, setNewRule] = useState<PricingRule>({
    category: '',
    margin_percentage: 15,
  })

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const response = await adminApi.get('/admin/pricing-rules')
      setRules(response.data.pricing_rules || [])
    } catch (error) {
      console.error('Failed to fetch pricing rules:', error)
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await adminApi.post('/admin/pricing-rules', newRule)
      fetchRules()
      setNewRule({ category: '', margin_percentage: 15 })
      alert('✅ Kural eklendi!')
    } catch (error) {
      console.error('Failed to add rule:', error)
      alert('❌ Kural eklenemedi.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kuralı silmek istediğinizden emin misiniz?')) return
    
    try {
      await adminApi.delete(`/admin/pricing-rules/${id}`)
      fetchRules()
      alert('✅ Kural silindi!')
    } catch (error) {
      console.error('Failed to delete rule:', error)
      alert('❌ Kural silinemedi.')
    }
  }

  const categories = ['Action', 'RPG', 'Strategy', 'Sports', 'Racing', 'Adventure', 'Simulation', 'Horror']

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-white">
              ← Geri
            </Link>
            <div>
              <h1 className="text-3xl font-black text-white">💰 Fiyatlandırma Kuralları</h1>
              <p className="text-gray-400">Kategori bazlı kar marjı ayarları</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add New Rule */}
          <div className="lg:col-span-1">
            <div className="gaming-card p-6 sticky top-4">
              <h2 className="text-xl font-bold text-white mb-4">Yeni Kural Ekle</h2>
              
              <form onSubmit={handleAddRule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Kategori
                  </label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  >
                    <option value="">Kategori seçin...</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Kar Marjı (%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newRule.margin_percentage}
                    onChange={(e) => setNewRule({ ...newRule, margin_percentage: parseInt(e.target.value) })}
                    className="w-full mb-2"
                  />
                  <div className="text-center">
                    <span className="text-3xl font-black text-[#ff6b35]">%{newRule.margin_percentage}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Min Fiyat ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRule.min_price || ''}
                      onChange={(e) => setNewRule({ ...newRule, min_price: parseFloat(e.target.value) || undefined })}
                      placeholder="Opsiyonel"
                      className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Fiyat ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newRule.max_price || ''}
                      onChange={(e) => setNewRule({ ...newRule, max_price: parseFloat(e.target.value) || undefined })}
                      placeholder="Opsiyonel"
                      className="w-full px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold hover:shadow-lg transition"
                >
                  + Kural Ekle
                </button>
              </form>
            </div>
          </div>

          {/* Rules List */}
          <div className="lg:col-span-2">
            <div className="gaming-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Mevcut Kurallar</h2>
              
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6b35] mx-auto"></div>
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">💰</div>
                  <p className="text-gray-400">Henüz kural eklenmemiş</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white">{rule.category}</h3>
                          <span className="px-3 py-1 bg-[#ff6b35] text-white text-sm font-bold rounded-full">
                            +%{rule.margin_percentage}
                          </span>
                        </div>
                        {(rule.min_price || rule.max_price) && (
                          <p className="text-sm text-gray-400">
                            {rule.min_price && `Min: $${rule.min_price}`}
                            {rule.min_price && rule.max_price && ' - '}
                            {rule.max_price && `Max: $${rule.max_price}`}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => rule.id && handleDelete(rule.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                      >
                        Sil
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Example */}
            <div className="mt-6 gaming-card p-6 bg-blue-500/5 border-blue-500/20">
              <h3 className="text-lg font-bold text-white mb-3">💡 Örnek Kullanım</h3>
              <div className="text-sm text-gray-400 space-y-2">
                <p><strong className="text-white">RPG oyunları için %20 marj:</strong></p>
                <p className="ml-4">• Provider fiyatı: $40 → Satış fiyatı: $48</p>
                <p className="ml-4">• Provider fiyatı: $60 → Satış fiyatı: $72</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

