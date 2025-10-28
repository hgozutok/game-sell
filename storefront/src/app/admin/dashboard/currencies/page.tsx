'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

interface Currency {
  code: string
  name: string
  symbol: string
  enabled: boolean
  exchange_rate: number
}

const availableCurrencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', enabled: true, exchange_rate: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', enabled: false, exchange_rate: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', enabled: false, exchange_rate: 0.79 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', enabled: false, exchange_rate: 32.50 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', enabled: false, exchange_rate: 1.36 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', enabled: false, exchange_rate: 1.53 },
]

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>(availableCurrencies)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await adminApi.get('/admin/currency')
        if (response.data.currencies) {
          setCurrencies(response.data.currencies)
        }
      } catch (error) {
        console.error('Failed to fetch currencies:', error)
      }
    }
    fetchCurrencies()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setSuccess(false)

    try {
      await adminApi.post('/admin/currency', { currencies })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save currencies:', error)
      alert('❌ Para birimleri kaydedilemedi.')
    } finally {
      setLoading(false)
    }
  }

  const toggleCurrency = (code: string) => {
    setCurrencies(currencies.map(c => 
      c.code === code ? { ...c, enabled: !c.enabled } : c
    ))
  }

  const updateRate = (code: string, rate: number) => {
    setCurrencies(currencies.map(c => 
      c.code === code ? { ...c, exchange_rate: rate } : c
    ))
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
              <h1 className="text-3xl font-black text-white">💱 Para Birimleri</h1>
              <p className="text-gray-400">Döviz kurları ve multi-currency ayarları</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg mb-6">
            ✅ Para birimi ayarları kaydedildi!
          </div>
        )}

        <div className="gaming-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Desteklenen Para Birimleri</h2>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : '💾 Kaydet'}
            </button>
          </div>

          <div className="space-y-4">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className={`border-2 rounded-lg p-5 transition ${
                  currency.enabled
                    ? 'border-[#ff6b35] bg-[#ff6b35]/5'
                    : 'border-gray-700 bg-[#1a1d24]'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{currency.symbol}</div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{currency.code}</h3>
                      <p className="text-sm text-gray-400">{currency.name}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currency.enabled}
                      onChange={() => toggleCurrency(currency.code)}
                      disabled={currency.code === 'USD'}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#ff6b35]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff6b35]"></div>
                    <span className="ms-3 text-sm font-medium text-gray-300">
                      {currency.enabled ? 'Aktif' : 'Pasif'}
                    </span>
                  </label>
                </div>

                {currency.enabled && currency.code !== 'USD' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Döviz Kuru (1 USD = ? {currency.code})
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={currency.exchange_rate}
                      onChange={(e) => updateRate(currency.code, parseFloat(e.target.value))}
                      className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Örnek: $100 USD = {(100 * currency.exchange_rate).toFixed(2)} {currency.code}
                    </p>
                  </div>
                )}

                {currency.code === 'USD' && (
                  <p className="text-xs text-gray-500">
                    ℹ️ USD varsayılan para birimidir ve devre dışı bırakılamaz
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 gaming-card p-6 bg-blue-500/5 border-blue-500/20">
          <h3 className="text-lg font-bold text-white mb-3">ℹ️ Nasıl Çalışır?</h3>
          <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
            <li>Aktif para birimleri müşterilere gösterilir</li>
            <li>Döviz kurları otomatik veya manuel olarak güncellenebilir</li>
            <li>Tüm fiyatlar USD cinsinden saklanır, görüntüleme sırasında dönüştürülür</li>
            <li>Müşteri kendi para birimini seçebilir</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

