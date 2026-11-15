'use client'

// Hesap ayarlari: dil, para birimi, e-posta/SMS pazarlama izinleri.
// Girisli kullanici icin backend customer.metadata.prefs'e kaydedilir.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/i18n/LocaleProvider'
import { LOCALES, LOCALE_META } from '@/i18n/config'
import { useCurrencyStore } from '@/store/currencyStore'
import { saveUserPrefs } from '@/lib/prefs'

export default function AccountSettingsPage() {
  const { customer } = useAuth()
  const { locale, setLocale } = useTranslation()
  const { selectedCurrency, currencies, setSelectedCurrency } = useCurrencyStore()

  const [emailMarketing, setEmailMarketing] = useState(false)
  const [smsMarketing, setSmsMarketing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const prefs = customer?.metadata?.prefs || {}
    if (typeof prefs.email_marketing === 'boolean') setEmailMarketing(prefs.email_marketing)
    if (typeof prefs.sms_marketing === 'boolean') setSmsMarketing(prefs.sms_marketing)
  }, [customer])

  const save = async ({
    nextLocale,
    nextCurrency,
    nextEmail,
    nextSms,
  }: {
    nextLocale?: string
    nextCurrency?: string
    nextEmail?: boolean
    nextSms?: boolean
  } = {}) => {
    setSaving(true)
    setMessage(null)
    try {
      const current = customer?.metadata?.prefs || {}
      await api.post('/store/customers/me', {
        metadata: {
          ...(customer?.metadata || {}),
          prefs: {
            ...current,
            currency: nextCurrency || selectedCurrency.code,
            locale: nextLocale || locale,
            email_marketing: nextEmail ?? emailMarketing,
            sms_marketing: nextSms ?? smsMarketing,
          },
        },
      })
      saveUserPrefs({
        currency: nextCurrency || selectedCurrency.code,
        locale: nextLocale || locale,
        email_marketing: nextEmail ?? emailMarketing,
        sms_marketing: nextSms ?? smsMarketing,
      })
      setMessage({ ok: true, text: 'Ayarlar hesabınıza kaydedildi.' })
    } catch (err: any) {
      setMessage({ ok: false, text: err?.response?.data?.message || 'Kaydedilemedi.' })
    } finally {
      setSaving(false)
    }
  }

  const changeLocale = (next: string) => {
    setLocale(next as any)
    void save({ nextLocale: next })
  }

  const changeCurrency = (next: string) => {
    const target = currencies.find((c) => c.code === next)
    if (target) {
      setSelectedCurrency(target)
      void save({ nextCurrency: next })
    }
  }

  const toggleMarketing = (kind: 'email' | 'sms', value: boolean) => {
    if (kind === 'email') setEmailMarketing(value)
    else setSmsMarketing(value)
    void save(kind === 'email' ? { nextEmail: value } : { nextSms: value })
  }

  const inputClass =
    'w-full bg-[#1a1d24] border border-gray-700 text-white px-3 py-2.5 rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm'
  const labelClass = 'block text-gray-400 text-sm mb-1.5'

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">⚙️ Hesap Ayarları</h1>
          <div className="w-16 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e]"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Dil ve para birimi */}
        <section className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">🌐 Dil ve Para Birimi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Dil</label>
              <select
                value={locale}
                onChange={(e) => changeLocale(e.target.value)}
                className={inputClass}
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {LOCALE_META[l].flag} {LOCALE_META[l].nativeLabel}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Para Birimi</label>
              <select
                value={selectedCurrency.code}
                onChange={(e) => changeCurrency(e.target.value)}
                className={inputClass}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code.toUpperCase()} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-3">
            Tercihler hesabınıza kaydedilir; başka bir cihazda giriş yaptığınızda otomatik uygulanır.
          </p>
        </section>

        {/* Pazarlama izinleri */}
        <section className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">📧 İletişim İzinleri</h2>
          <p className="text-gray-400 text-sm mb-4">
            Kampanya ve indirim duyurularını nasıl almak istediğinizi seçin. Dilediğiniz zaman
            değiştirebilirsiniz.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailMarketing}
                onChange={(e) => toggleMarketing('email', e.target.checked)}
                className="w-4 h-4 accent-[#ff6b35]"
              />
              <span className="text-white text-sm">
                E-posta ile kampanya ve yeniliklerden haberdar olmak istiyorum
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={smsMarketing}
                onChange={(e) => toggleMarketing('sms', e.target.checked)}
                className="w-4 h-4 accent-[#ff6b35]"
              />
              <span className="text-white text-sm">
                SMS ile önemli duyuruları almak istiyorum
              </span>
            </label>
          </div>
          {message && (
            <p className={`mt-3 text-sm ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}
        </section>

        <div className="flex gap-4 text-sm">
          <Link href="/account/profile" className="text-[#ff6b35] hover:underline">
            👤 Profil bilgileri →
          </Link>
          <Link href="/account/wishlist" className="text-[#ff6b35] hover:underline">
            ❤️ Favorilerim →
          </Link>
        </div>
      </div>
    </div>
  )
}
