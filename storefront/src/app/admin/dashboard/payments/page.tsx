'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'
import PaymentFeesCard from './PaymentFeesCard'

interface PaymentSystem {
  id: string
  name: string
  status: 'active' | 'inactive'
  description: string
  icon: string
  features: string[]
  config: Record<string, string>
}

interface FeeInfo {
  percent: number
  fixedMinor: number
  currency: string
}

/** "%3 + 0.30 GBP" biciminde komisyon ozeti. */
function formatFee(fee?: FeeInfo): string {
  if (!fee) return ''
  const parts: string[] = []
  if (fee.percent > 0) parts.push(`%${fee.percent}`)
  if (fee.fixedMinor > 0) {
    parts.push(`${(fee.fixedMinor / 100).toFixed(2)} ${fee.currency.toUpperCase()}`)
  }
  return parts.join(' + ')
}

const defaultPaymentSystems: Omit<PaymentSystem, 'status' | 'config'>[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Kredi/banka kartı ile güvenli ödeme',
    icon: '💳',
    features: ['Visa / Mastercard', '3D Secure', 'Stripe Elements'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'PayPal ile ödeme al',
    icon: '🌐',
    features: ['PayPal Hesabı', 'Güvenli Ödeme'],
  },
  {
    id: 'mollie',
    name: 'Mollie',
    description: 'iDEAL, Bancontact ve daha fazlası',
    icon: '🇪🇺',
    features: ['iDEAL', 'Bancontact', 'SEPA', 'Kredi Kartı'],
  },
  {
    id: 'bank_transfer',
    name: 'Banka Havalesi',
    description: 'Manuel banka havalesi',
    icon: '🏦',
    features: ['UK Banka Havalesi', 'Manuel Onay'],
  },
]

const requiredFields: Record<string, string[]> = {
  stripe: ['publishable_key', 'secret_key'],
  paypal: ['client_id', 'client_secret'],
  mollie: ['api_key'],
  bank_transfer: ['bank_name', 'account_name', 'iban'],
}

export default function PaymentsPage() {
  const [systems, setSystems] = useState<PaymentSystem[]>([])
  const [fees, setFees] = useState<Record<string, FeeInfo>>({})
  const [loading, setLoading] = useState(true)
  const [selectedSystem, setSelectedSystem] = useState<PaymentSystem | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})

  // Load payment settings from backend
  useEffect(() => {
    loadPaymentSettings()
  }, [])

  const loadPaymentSettings = async () => {
    try {
      const response = await adminApi.get('/admin/payment-settings')
      const backendSettings = response.data.settings || {}

      const updatedSystems = defaultPaymentSystems.map(sys => ({
        ...sys,
        status: backendSettings[sys.id]?.active ? 'active' as const : 'inactive' as const,
        config: backendSettings[sys.id]?.config || {},
      }))

      setSystems(updatedSystems)

      // Saglayici komisyonlari (payment.fee.<provider>.*)
      try {
        const feeResponse = await adminApi.get('/admin/settings')
        const feeMap: Record<string, any> = {}
        ;(feeResponse.data?.settings || []).forEach((item: any) => {
          feeMap[item.key] = item.value
        })
        const nextFees: Record<string, FeeInfo> = {}
        for (const sys of defaultPaymentSystems) {
          const feeId = sys.id.replace(/_/g, '-')
          nextFees[sys.id] = {
            percent: Number(feeMap[`payment.fee.${feeId}.percent`] || 0),
            fixedMinor: Number(feeMap[`payment.fee.${feeId}.fixed_minor`] || 0),
            currency: String(feeMap[`payment.fee.${feeId}.currency`] || 'gbp'),
          }
        }
        setFees(nextFees)
      } catch {
        /* komisyon ayarlari okunamazsa odeme sistemleri yine gorunur */
      }
    } catch (err) {
      console.error('Failed to load payment settings:', err)
      // Use defaults if backend fails
      const defaultSystems = defaultPaymentSystems.map(sys => ({
        ...sys,
        status: sys.id === 'bank_transfer' ? 'active' as const : 'inactive' as const,
        config: {},
      }))
      setSystems(defaultSystems)
    } finally {
      setLoading(false)
    }
  }

  const isConfigured = (system: PaymentSystem) => {
    const fields = requiredFields[system.id] || []
    return fields.every((field) => Boolean((system.config?.[field] || '').trim()))
  }

  const toggleSystem = async (systemId: string) => {
    const system = systems.find(s => s.id === systemId)
    if (!system) return

    const newStatus = system.status === 'active' ? 'inactive' : 'active'

    if (newStatus === 'active' && !isConfigured(system)) {
      alert(`⚠️ ${system.name} için önce zorunlu alanları doldurun: ${(requiredFields[system.id] || []).join(', ')}`)
      openConfiguration(system)
      return
    }

    try {
      await adminApi.post('/admin/payment-settings', {
        provider: systemId,
        active: newStatus === 'active',
        config: system.config,
      })

      setSystems(prev =>
        prev.map(sys =>
          sys.id === systemId
            ? { ...sys, status: newStatus }
            : sys
        )
      )

      alert(`✅ ${system.name} ${newStatus === 'active' ? 'aktif edildi' : 'devre dışı bırakıldı'}!`)
    } catch (err) {
      console.error('Failed to toggle system:', err)
      alert('❌ Ayarlar kaydedilemedi!')
    }
  }

  const openConfiguration = (system: PaymentSystem) => {
    setSelectedSystem(system)
    setConfigValues(system.config || {})
  }

  const saveConfiguration = async () => {
    if (!selectedSystem) return

    try {
      await adminApi.post('/admin/payment-settings', {
        provider: selectedSystem.id,
        active: selectedSystem.status === 'active',
        config: configValues,
      })

      // Update local state
      setSystems(prev =>
        prev.map(sys =>
          sys.id === selectedSystem.id
            ? { ...sys, config: configValues }
            : sys
        )
      )

      alert('✅ Yapılandırma kaydedildi!')
      setSelectedSystem(null)
      setConfigValues({})
    } catch (err) {
      console.error('Failed to save configuration:', err)
      alert('❌ Yapılandırma kaydedilemedi!')
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
          </div>
        ) : (
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

              <div className="mb-4 text-xs">
                {formatFee(fees[system.id]) ? (
                  <span className="text-gray-400">
                    Komisyon:{' '}
                    <span className="text-[#ff6b35] font-semibold">
                      {formatFee(fees[system.id])}
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-600">Komisyon tanımlı değil</span>
                )}
              </div>

              <div className="mb-4 text-xs">
                {isConfigured(system) ? (
                  <span className="text-green-400">✓ Yapılandırıldı</span>
                ) : (
                  <span className="text-yellow-400">⚠ Eksik bilgi — Yapılandır'a tıklayın</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openConfiguration(system)}
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
        )}

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
                {selectedSystem.id === 'paypal' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">PayPal Client ID</label>
                      <input
                        type="text"
                        value={configValues.client_id || selectedSystem.config.client_id || ''}
                        onChange={(e) => setConfigValues(prev => ({ ...prev, client_id: e.target.value }))}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="PayPal Client ID"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">PayPal Secret</label>
                      <input
                        type="password"
                        value={configValues.client_secret || selectedSystem.config.client_secret || ''}
                        onChange={(e) => setConfigValues(prev => ({ ...prev, client_secret: e.target.value }))}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="PayPal Secret"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="paypal_sandbox"
                        checked={configValues.sandbox === 'true' || selectedSystem.config.sandbox === 'true'}
                        onChange={(e) => setConfigValues(prev => ({ ...prev, sandbox: e.target.checked ? 'true' : 'false' }))}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="paypal_sandbox" className="text-white text-sm">
                        Sandbox Mode (Test)
                      </label>
                    </div>
                  </>
                )}

                {selectedSystem.id === 'mollie' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Mollie API Key</label>
                      <input
                        type="password"
                        value={configValues.api_key || selectedSystem.config.api_key || ''}
                        onChange={(e) => setConfigValues(prev => ({ ...prev, api_key: e.target.value }))}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="test_xxx veya live_xxx"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Mollie Dashboard → Developers → API keys
                    </p>
                  </>
                )}

                {selectedSystem.id === 'stripe' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">
                        Stripe Publishable Key
                      </label>
                      <input
                        type="text"
                        value={
                          configValues.publishable_key ||
                          selectedSystem.config.publishable_key ||
                          ''
                        }
                        onChange={(e) =>
                          setConfigValues((prev) => ({ ...prev, publishable_key: e.target.value }))
                        }
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="pk_test_... veya pk_live_..."
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">
                        Stripe Secret Key
                      </label>
                      <input
                        type="password"
                        value={configValues.secret_key || selectedSystem.config.secret_key || ''}
                        onChange={(e) =>
                          setConfigValues((prev) => ({ ...prev, secret_key: e.target.value }))
                        }
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="sk_test_... veya sk_live_..."
                      />
                    </div>
                    <div className="text-gray-400 text-xs space-y-1">
                      <p>
                        Secret key panele kaydedilir. Backend'in Stripe saglayicisini yuklemesi
                        icin <code className="text-gray-300">STRIPE_API_KEY</code> ortam
                        degiskenine de yazilmalidir.
                      </p>
                      <p>Webhook adresi: /hooks/payment/stripe_stripe</p>
                    </div>
                  </>
                )}

                {selectedSystem.id === 'bank_transfer' && (
                  <div className="space-y-4">
                    {[
                      { key: 'bank_name', label: 'Banka Adı', placeholder: 'Barclays Bank UK' },
                      { key: 'account_name', label: 'Hesap Sahibi', placeholder: 'Digital Game Store Ltd' },
                      { key: 'iban', label: 'IBAN', placeholder: 'GB29NWBK60161331926819' },
                      { key: 'account_number', label: 'Hesap Numarası', placeholder: '12345678' },
                      { key: 'sort_code', label: 'Sort Code', placeholder: '20-00-00' },
                      { key: 'swift', label: 'SWIFT / BIC', placeholder: 'BARCGB22' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="text-gray-400 text-sm mb-2 block">{field.label}</label>
                        <input
                          type="text"
                          value={
                            configValues[field.key] || selectedSystem.config[field.key] || ''
                          }
                          onChange={(e) =>
                            setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-gray-400 text-sm mb-2 block">Ödeme Notu</label>
                      <textarea
                        rows={2}
                        value={configValues.note || selectedSystem.config.note || ''}
                        onChange={(e) => setConfigValues((prev) => ({ ...prev, note: e.target.value }))}
                        className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
                        placeholder="Lütfen açıklama kısmına sipariş numaranızı yazın."
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSystem(null)
                    setConfigValues({})
                    setTimeout(
                      () =>
                        document
                          .getElementById('payment-fees')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                      50
                    )
                  }}
                  className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg text-sm hover:border-[#ff6b35] transition"
                >
                  💸 Komisyon Ayarları (% + sabit ücret)
                </button>

                <button
                  onClick={saveConfiguration}
                  className="w-full px-4 py-3 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition"
                >
                  💾 Yapılandırmayı Kaydet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Odeme komisyonlari — saglayici basina % + sabit tutar */}
        <div className="mt-6">
          <PaymentFeesCard onSaved={loadPaymentSettings} />
        </div>
      </div>
    </div>
  )
}


