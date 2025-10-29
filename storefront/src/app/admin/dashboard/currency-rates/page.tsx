'use client'

import { useState, useEffect } from 'react'
import { adminApi } from '@/lib/admin-api'
import toast, { Toaster } from 'react-hot-toast'

interface CurrencyRate {
  code: string
  name: string
  symbol: string
  rate: number
}

export default function CurrencyRatesPage() {
  const [rates, setRates] = useState<CurrencyRate[]>([
    { code: 'usd', name: 'US Dollar', symbol: '$', rate: 1.00 },
    { code: 'eur', name: 'Euro', symbol: '€', rate: 0.92 },
    { code: 'gbp', name: 'British Pound', symbol: '£', rate: 0.79 },
    { code: 'try', name: 'Turkish Lira', symbol: '₺', rate: 34.50 },
  ])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRates()
  }, [])

  const fetchRates = async () => {
    setLoading(true)
    try {
      const response = await adminApi.get('/admin/settings/currency_rates')
      if (response.data.value) {
        setRates(JSON.parse(response.data.value))
      }
    } catch (error) {
      console.error('Failed to fetch currency rates:', error)
      // Use default rates if fetch fails
    } finally {
      setLoading(false)
    }
  }

  const handleRateChange = (code: string, newRate: number) => {
    setRates(rates.map(r => r.code === code ? { ...r, rate: newRate } : r))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminApi.post('/admin/settings', {
        key: 'currency_rates',
        value: JSON.stringify(rates),
      })
      toast.success('Currency rates saved successfully!', {
        style: { background: '#15171c', color: '#fff', border: '1px solid #ff6b35' },
      })
    } catch (error: any) {
      console.error('Failed to save currency rates:', error)
      toast.error('Failed to save currency rates', {
        style: { background: '#15171c', color: '#fff', border: '1px solid #ef4444' },
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFetchLiveRates = async () => {
    setSaving(true)
    try {
      // Fetch live rates from an API (you can use exchangerate-api.com or similar)
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const data = await response.json()
      
      setRates([
        { code: 'usd', name: 'US Dollar', symbol: '$', rate: 1.00 },
        { code: 'eur', name: 'Euro', symbol: '€', rate: parseFloat(data.rates.EUR.toFixed(4)) },
        { code: 'gbp', name: 'British Pound', symbol: '£', rate: parseFloat(data.rates.GBP.toFixed(4)) },
        { code: 'try', name: 'Turkish Lira', symbol: '₺', rate: parseFloat(data.rates.TRY.toFixed(4)) },
      ])
      
      toast.success('Live rates fetched successfully!', {
        icon: '🌍',
        style: { background: '#15171c', color: '#fff', border: '1px solid #ff6b35' },
      })
    } catch (error) {
      console.error('Failed to fetch live rates:', error)
      toast.error('Failed to fetch live rates', {
        style: { background: '#15171c', color: '#fff', border: '1px solid #ef4444' },
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] p-8">
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">💱 CURRENCY RATES</h1>
            <p className="text-gray-400">Manage exchange rates for multi-currency pricing</p>
          </div>
          <button
            onClick={handleFetchLiveRates}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-50"
          >
            {saving ? 'Fetching...' : '🌍 Fetch Live Rates'}
          </button>
        </div>

        {/* Currency Rates Table */}
        <div className="gaming-card p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6b35]"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-5 gap-4 pb-4 border-b border-gray-700 font-semibold text-gray-400 text-sm">
                <div>Currency</div>
                <div>Symbol</div>
                <div>Code</div>
                <div>Rate (vs USD)</div>
                <div>Example</div>
              </div>

              {/* Currency Rows */}
              {rates.map((currency) => (
                <div key={currency.code} className="grid grid-cols-5 gap-4 items-center py-3 border-b border-gray-800">
                  {/* Name */}
                  <div className="text-white font-medium">{currency.name}</div>

                  {/* Symbol */}
                  <div className="text-2xl">{currency.symbol}</div>

                  {/* Code */}
                  <div className="text-gray-400 font-mono uppercase">{currency.code}</div>

                  {/* Rate Input */}
                  <div>
                    {currency.code === 'usd' ? (
                      <div className="text-white font-semibold">1.0000 (Base)</div>
                    ) : (
                      <input
                        type="number"
                        step="0.0001"
                        value={currency.rate}
                        onChange={(e) => handleRateChange(currency.code, parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Example */}
                  <div className="text-gray-400 text-sm">
                    $10.00 = {currency.symbol}{(10 * currency.rate).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 text-xl">ℹ️</span>
              <div className="text-sm text-gray-400">
                <p className="mb-2">
                  <strong className="text-blue-400">How it works:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>USD is the base currency (always 1.0000)</li>
                  <li>Enter the conversion rate: 1 USD = X currency</li>
                  <li>Example: If 1 USD = 0.92 EUR, enter 0.92 for EUR</li>
                  <li>Click "Fetch Live Rates" to get real-time exchange rates</li>
                  <li>All product prices will be automatically converted</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={fetchRates}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-[#ff6b35]/50 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Currency Rates'}
            </button>
          </div>
        </div>

        {/* Current Rates Summary */}
        <div className="gaming-card p-6 mt-6">
          <h2 className="text-xl font-bold text-white mb-4">📊 CURRENT RATES SUMMARY</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rates.map((currency) => (
              <div key={currency.code} className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">{currency.symbol}</div>
                <div className="text-gray-400 text-sm mb-1">{currency.code.toUpperCase()}</div>
                <div className="text-white font-bold text-lg">
                  {currency.code === 'usd' ? '1.0000' : currency.rate.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

