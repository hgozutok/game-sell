'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PaymentSystem {
  id: string
  name: string
  status: 'active' | 'inactive'
  description: string
  icon: string
  features: string[]
}

const paymentSystems: PaymentSystem[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    status: 'inactive',
    description: 'Kredi kartı ile ödeme al',
    icon: '💳',
    features: ['Kredi Kartı', 'Apple Pay', 'Google Pay', 'Visa', 'Mastercard'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    status: 'inactive',
    description: 'PayPal ile ödeme al',
    icon: '🌐',
    features: ['PayPal Hesabı', 'Güvenli Ödeme'],
  },
  {
    id: 'crypto',
    name: 'Kripto Para',
    status: 'inactive',
    description: 'Kripto para ile ödeme al',
    icon: '₿',
    features: ['Bitcoin', 'Ethereum', 'USDT'],
  },
]

export default function PaymentsPage() {
  const [systems, setSystems] = useState<PaymentSystem[]>(paymentSystems)
  const [selectedSystem, setSelectedSystem] = useState<PaymentSystem | null>(null)

  const toggleSystem = (systemId: string) => {
    setSystems(prev =>
      prev.map(sys =>
        sys.id === systemId
          ? { ...sys, status: sys.status === 'active' ? 'inactive' : 'active' }
          : sys
      )
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                💳 Ödeme Sistemleri
              </h1>
              <p className="text-gray-400">Ödeme yöntemlerini yönet ve yapılandır</p>
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
        {/* Info Box */}
        <div className="gaming-card p-6 bg-blue-500/5 border-blue-500/20 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">ℹ️</div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Ödeme Sistemleri Nasıl Çalışır?</h3>
              <p className="text-sm text-gray-400">
                Ödeme sistemlerini aktif etmek için ilgili sistemin kendi sayfasından API anahtarlarını yapılandırmanız gerekmektedir.
                Her ödeme sistemi için benzersiz kimlik bilgileri gereklidir.
              </p>
            </div>
          </div>
        </div>

        {/* Payment Systems List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systems.map((system) => (
            <div
              key={system.id}
              className={`gaming-card p-6 relative ${
                system.status === 'active' ? 'ring-2 ring-green-500' : ''
              }`}
            >
              {/* Active Badge */}
              {system.status === 'active' && (
                <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  AKTİF
                </div>
              )}

              <div className="text-5xl mb-4">{system.icon}</div>
              <h3 className="text-xl font-black text-white mb-2">{system.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{system.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {system.features.map((feature) => (
                  <span
                    key={feature}
                    className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSystem(system)}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition"
                >
                  Yapılandır
                </button>
                <button
                  onClick={() => toggleSystem(system.id)}
                  className={`flex-1 px-4 py-2 rounded-lg font-bold transition ${
                    system.status === 'active'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  {system.status === 'active' ? 'Devre Dışı' : 'Aktif Et'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Configuration Modal */}
        {selectedSystem && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="gaming-card p-6 max-w-md w-full m-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-white">
                  {selectedSystem.name} Yapılandırma
                </h3>
                <button
                  onClick={() => setSelectedSystem(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedSystem.id === 'stripe' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Stripe Public Key</label>
                      <input
                        type="text"
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="pk_test_..."
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Stripe Secret Key</label>
                      <input
                        type="password"
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="sk_test_..."
                      />
                    </div>
                  </>
                )}

                {selectedSystem.id === 'paypal' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">PayPal Client ID</label>
                      <input
                        type="text"
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="Client ID"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">PayPal Secret</label>
                      <input
                        type="password"
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="Secret"
                      />
                    </div>
                  </>
                )}

                {selectedSystem.id === 'crypto' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Cüzdan Adresi</label>
                      <input
                        type="text"
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                      />
                    </div>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 text-white">
                        <input type="checkbox" className="w-4 h-4 rounded" />
                        Bitcoin
                      </label>
                      <label className="flex items-center gap-2 text-white">
                        <input type="checkbox" className="w-4 h-4 rounded" />
                        Ethereum
                      </label>
                    </div>
                  </>
                )}

                <button
                  onClick={() => {
                    alert('Yapılandırma kaydedildi!')
                    setSelectedSystem(null)
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


