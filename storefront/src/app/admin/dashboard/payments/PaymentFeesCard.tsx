'use client'

// Odeme komisyonu editoru: saglayici basina "%X + sabit tutar (kendi kurunda)".
// Ayarlar payment.fee.<provider>.* anahtarlariyla store_settings'e yazilir;
// checkout ve siparis olusturma bu anahtarlari canli okur.
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const PROVIDERS = [
  { id: 'stripe', label: 'Stripe' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'mollie', label: 'Mollie' },
  { id: 'bank-transfer', label: 'Bank Transfer' },
]

const CURRENCIES = ['gbp', 'usd', 'eur', 'try']

interface FeeState {
  percent: string
  fixed: string
  currency: string
}

const EMPTY: FeeState = { percent: '', fixed: '', currency: 'gbp' }

function clampPercent(value: string): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.min(Math.max(n, 0), 100)
}

/** Admin formunda ornek hesap: 100 birimlik sipariste komisyon. */
function exampleFee(state: FeeState): string {
  const percent = clampPercent(state.percent)
  const fixed = Math.max(0, Number(state.fixed) || 0)
  const amount = 100 * (percent / 100) + fixed
  return `${amount.toFixed(2)} ${state.currency.toUpperCase()}`
}

// admin panelde "0.30 GBP" girilir -> backend minor'a cevirir (30)
export default function PaymentFeesCard({ onSaved }: { onSaved?: () => void }) {
  const [fees, setFees] = useState<Record<string, FeeState>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminApi.get('/admin/settings')
        const list: Array<{ key: string; value: any }> = response.data?.settings || []
        const map: Record<string, any> = {}
        list.forEach((item) => {
          map[item.key] = item.value
        })
        const next: Record<string, FeeState> = {}
        for (const p of PROVIDERS) {
          const percent = Number(map[`payment.fee.${p.id}.percent`] ?? 0)
          // DB'de minor saklanir; editorda major goster
          const fixedMinor = Number(map[`payment.fee.${p.id}.fixed_minor`] ?? 0)
          next[p.id] = {
            percent: percent ? String(percent) : '',
            fixed: fixedMinor ? String(fixedMinor / 100) : '',
            currency: String(map[`payment.fee.${p.id}.currency`] ?? 'gbp'),
          }
        }
        setFees(next)
      } catch {
        setMessage({ ok: false, text: 'Ayarlar yüklenemedi' })
      }
    }
    void load()
  }, [])

  const save = async () => {
    try {
      setSaving(true)
      setMessage(null)
      const settings: Array<{ key: string; value: any }> = []
      for (const p of PROVIDERS) {
        const st = fees[p.id] || EMPTY
        const percent = clampPercent(st.percent)
        const fixedMajor = Math.max(0, Number(st.fixed) || 0)
        settings.push({ key: `payment.fee.${p.id}.percent`, value: percent })
        settings.push({ key: `payment.fee.${p.id}.fixed_minor`, value: Math.round(fixedMajor * 100) })
        settings.push({ key: `payment.fee.${p.id}.currency`, value: st.currency })
      }
      await adminApi.post('/admin/settings/batch', { settings })
      setMessage({ ok: true, text: 'Komisyon ayarları kaydedildi' })
      onSaved?.()
    } catch {
      setMessage({ ok: false, text: 'Kaydedilemedi' })
    } finally {
      setSaving(false)
    }
  }

  const update = (id: string, patch: Partial<FeeState>) => {
    setFees((prev) => ({ ...prev, [id]: { ...(prev[id] || EMPTY), ...patch } }))
  }

  const inputClass =
    'w-full bg-[#0a0b0d] border border-gray-700 text-white px-3 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm'

  return (
    <div id="payment-fees" className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
      <h3 className="text-white font-bold text-lg mb-2">Ödeme Komisyonları</h3>
      <p className="text-gray-400 text-sm mb-4">
        Her ödeme sağlayıcısı için <strong className="text-gray-300">yüzde + sabit tutar</strong>{' '}
        komisyonu girin. Sabit tutar seçtiğiniz para biriminde yazılır ve sipariş para birimine
        çevrilir. Örnek: Stripe için <strong className="text-gray-300">%3 + 0.30 GBP</strong>.
        Checkout'ta komisyon ayrı satır olarak gösterilir ve sipariş toplamına eklenir.
      </p>

      <div className="space-y-4">
        {PROVIDERS.map((p) => {
          const st = fees[p.id] || EMPTY
          return (
            <div key={p.id} className="border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">{p.label}</div>
                <div className="text-xs text-gray-500">
                  100 {st.currency.toUpperCase()} siparişte ≈{' '}
                  <span className="text-[#ff6b35] font-semibold">{exampleFee(st)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Komisyon (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={st.percent}
                    onChange={(e) => update(p.id, { percent: e.target.value })}
                    placeholder="3"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Sabit Ücret ({st.currency.toUpperCase()})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={st.fixed}
                    onChange={(e) => update(p.id, { fixed: e.target.value })}
                    placeholder="0.30"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">Sabit Ücret Para Birimi</label>
                  <select
                    value={st.currency}
                    onChange={(e) => update(p.id, { currency: e.target.value })}
                    className={inputClass}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="mt-4 bg-[#ff6b35] hover:bg-[#e55a2b] disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-sm"
      >
        {saving ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </div>
  )
}
