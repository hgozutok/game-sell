'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { adminApi } from '@/lib/admin-api'
import { translate } from '@/i18n'
import SocialLoginCard from './SocialLoginCard'
import BotProtectionCard from './BotProtectionCard'
import AdminAccessCard from './AdminAccessCard'

/** "facebook.com/x" gibi yazimlari https:// ile tamamlar. */
function normalizeSocialUrl(value: string) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, '')}`
}

function isValidSocialUrl(url: string) {
  if (!url) return true
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    store_name: 'Digital Game Store',
    store_description: 'Your trusted source for digital game keys',
    support_email: 'support@digitalgamestore.com',
    currency: 'USD',
    tax_rate: 0,
    enable_wishlist: true,
    enable_reviews: true,
    kinguin_currency: 'EUR',
    codeswholesale_currency: 'USD',
    whatsapp_number: '',
    whatsapp_message: '',
    max_price_eur: 100,
    cart_max_total_eur: 0,
    logo_url: '',
    social_facebook: '',
    social_instagram: '',
    social_x: '',
    social_linkedin: '',
    social_youtube: '',
    ga_measurement_id: '',
    announcement_enabled: true,
    announcement_en: '',
    announcement_tr: '',
    announcement_de: '',
    announcement_fr: '',
    announcement_ar: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [countryRates, setCountryRates] = useState<Record<string, number>>({})
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const countryOptions = [
    { code: 'US', label: 'United States' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'DE', label: 'Germany' },
    { code: 'FR', label: 'France' },
    { code: 'ES', label: 'Spain' },
    { code: 'IT', label: 'Italy' },
    { code: 'NL', label: 'Netherlands' },
    { code: 'BE', label: 'Belgium' },
    { code: 'SE', label: 'Sweden' },
    { code: 'NO', label: 'Norway' },
    { code: 'DK', label: 'Denmark' },
    { code: 'TR', label: 'Turkey' },
    { code: 'CA', label: 'Canada' },
    { code: 'EU', label: 'European Union' },
  ]

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Admin kaynagindan oku (public store endpoint'e bagimli degil)
        const response = await adminApi.get('/admin/settings')
        const list: Array<{ key: string; value: any }> = response.data?.settings || []
        const map: Record<string, any> = {}
        list.forEach((item) => {
          map[item.key] = item.value
        })

        setSettings((prev) => ({
          ...prev,
          store_name: map['store.name'] ?? prev.store_name,
          store_description: map['store.description'] ?? '',
          support_email: map['store.support_email'] ?? prev.support_email,
          currency: String(map['currencies.default'] ?? prev.currency).toUpperCase(),
          tax_rate: Number(map['tax.rate'] ?? 0),
          enable_wishlist: map['store.enable_wishlist'] !== false,
          enable_reviews: map['store.enable_reviews'] !== false,
          whatsapp_number: map['store.whatsapp_number'] ?? '',
          whatsapp_message: map['store.whatsapp_message'] ?? '',
          max_price_eur: Number(map['catalog.max_price_eur'] ?? 100),
          cart_max_total_eur: Number(map['cart.max_total_eur'] ?? 0),
          logo_url: map['store.logo_url'] ?? '',
          social_instagram: map['store.social.instagram'] ?? '',
          announcement_enabled: map['store.announcement.enabled'] !== false,
          announcement_en: map['store.announcement.en'] ?? '',
          announcement_tr: map['store.announcement.tr'] ?? '',
          announcement_de: map['store.announcement.de'] ?? '',
          announcement_fr: map['store.announcement.fr'] ?? '',
          announcement_ar: map['store.announcement.ar'] ?? '',
          social_facebook: map['store.social.facebook'] ?? '',
          social_x: map['store.social.x'] ?? '',
          social_linkedin: map['store.social.linkedin'] ?? '',
          social_youtube: map['store.social.youtube'] ?? '',
          ga_measurement_id: map['analytics.google_measurement_id'] ?? '',
        }))

        try {
          const providerCurrencyRes = await adminApi.get('/admin/settings/provider-currency')
          const providerData = providerCurrencyRes.data || {}

          setSettings((prev) => ({
            ...prev,
            kinguin_currency: (providerData.kinguin_currency || 'eur').toUpperCase(),
            codeswholesale_currency: (providerData.codeswholesale_currency || 'usd').toUpperCase(),
          }))
        } catch (providerError) {
          console.warn('Failed to fetch provider currency settings:', providerError)
        }

        // Load per-country tax rates
        try {
          const taxRes = await adminApi.get('/admin/settings/tax/countries')
          const map = taxRes.data?.country_tax_rates || {}
          setCountryRates(map)
        } catch (taxError) {
          console.warn('Failed to fetch country tax rates:', taxError)
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error)
        alert('Ayarlar yuklenemedi. Backend calisiyor mu?')
      }
    }
    fetchSettings()
  }, [])

  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo en fazla 2 MB olabilir')
      return
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Dosya okunamadi'))
      reader.readAsDataURL(file)
    })

    setUploadingLogo(true)
    try {
      const res = await adminApi.post('/admin/settings/logo', { data_url: dataUrl })
      const url = res.data?.url || ''
      setSettings((prev) => ({ ...prev, logo_url: url }))
      // Hemen kaydet; kullanici ayrica Kaydet'e basmak zorunda kalmasin
      await adminApi.post('/admin/settings', {
        key: 'store.logo_url',
        value: url,
        category: 'store',
      })
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Logo yuklenemedi')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const email = String(settings.support_email || '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Geçerli bir destek e-postası girin. Örnek: destek@magaza.com')
      return
    }

    const socialUrls = {
      facebook: normalizeSocialUrl(settings.social_facebook),
      instagram: normalizeSocialUrl(settings.social_instagram),
      x: normalizeSocialUrl(settings.social_x),
      linkedin: normalizeSocialUrl(settings.social_linkedin),
      youtube: normalizeSocialUrl(settings.social_youtube),
    }

    const invalidSocial = Object.entries(socialUrls).find(([, url]) => !isValidSocialUrl(url))
    if (invalidSocial) {
      alert('Geçerli bir sosyal medya adresi girin. Örnek: https://facebook.com/magazaniz')
      return
    }

    setSettings((prev) => ({
      ...prev,
      social_facebook: socialUrls.facebook,
      social_instagram: socialUrls.instagram,
      social_x: socialUrls.x,
      social_linkedin: socialUrls.linkedin,
      social_youtube: socialUrls.youtube,
    }))

    setLoading(true)
    setSuccess(false)

    try {
      // Tum ayarlari tek istekte kaydet
      const settingsToSave = [
        { key: 'store.name', value: settings.store_name, category: 'store' },
        { key: 'store.description', value: settings.store_description, category: 'store' },
        { key: 'store.support_email', value: email, category: 'store' },
        { key: 'store.logo_url', value: settings.logo_url, category: 'store' },
        { key: 'store.social.facebook', value: socialUrls.facebook, category: 'store' },
        { key: 'store.social.instagram', value: socialUrls.instagram, category: 'store' },
        { key: 'store.social.x', value: socialUrls.x, category: 'store' },
        { key: 'store.social.linkedin', value: socialUrls.linkedin, category: 'store' },
        { key: 'store.social.youtube', value: socialUrls.youtube, category: 'store' },
        { key: 'analytics.google_measurement_id', value: (settings.ga_measurement_id || '').trim(), category: 'store' },
        { key: 'store.announcement.enabled', value: settings.announcement_enabled, category: 'store' },
        { key: 'store.announcement.en', value: settings.announcement_en, category: 'store' },
        { key: 'store.announcement.tr', value: settings.announcement_tr, category: 'store' },
        { key: 'store.announcement.de', value: settings.announcement_de, category: 'store' },
        { key: 'store.announcement.fr', value: settings.announcement_fr, category: 'store' },
        { key: 'store.announcement.ar', value: settings.announcement_ar, category: 'store' },
        { key: 'store.enable_wishlist', value: settings.enable_wishlist, category: 'store' },
        { key: 'store.enable_reviews', value: settings.enable_reviews, category: 'store' },
        { key: 'store.whatsapp_number', value: settings.whatsapp_number, category: 'store' },
        { key: 'store.whatsapp_message', value: settings.whatsapp_message, category: 'store' },
        { key: 'currencies.default', value: settings.currency, category: 'currencies' },
        { key: 'tax.rate', value: Number(settings.tax_rate) || 0, category: 'tax' },
        { key: 'catalog.max_price_eur', value: Number(settings.max_price_eur) || 0, category: 'catalog' },
        { key: 'cart.max_total_eur', value: Number(settings.cart_max_total_eur) || 0, category: 'cart' },
      ]

      await adminApi.post('/admin/settings/batch', { settings: settingsToSave })

      // Yardımcı ayarlar ana kaydı bloklamaz
      try {
        await adminApi.post('/admin/settings/provider-currency', {
          kinguin_currency: settings.kinguin_currency?.toLowerCase?.() || 'eur',
          codeswholesale_currency: settings.codeswholesale_currency?.toLowerCase?.() || 'usd',
        })
      } catch (providerError) {
        console.warn('Provider currency save failed:', providerError)
      }

      // Save per-country tax rates
      try {
        await adminApi.post('/admin/settings/tax/countries', {
          country_tax_rates: countryRates,
        })
      } catch (taxError) {
        console.warn('Country tax save failed:', taxError)
      }

      // Sunucudan geri oku — kaydedilen degerler ekranda kalsin
      try {
        const fresh = await adminApi.get('/admin/settings')
        const list: Array<{ key: string; value: any }> = fresh.data?.settings || []
        const map: Record<string, any> = {}
        list.forEach((item) => {
          map[item.key] = item.value
        })
        setSettings((prev) => ({
          ...prev,
          store_name: map['store.name'] ?? prev.store_name,
          store_description: map['store.description'] ?? prev.store_description,
          support_email: map['store.support_email'] ?? prev.support_email,
          logo_url: map['store.logo_url'] ?? prev.logo_url,
          social_instagram: map['store.social.instagram'] ?? '',
          social_facebook: map['store.social.facebook'] ?? '',
          social_x: map['store.social.x'] ?? '',
          social_linkedin: map['store.social.linkedin'] ?? '',
          social_youtube: map['store.social.youtube'] ?? '',
          currency: String(map['currencies.default'] ?? prev.currency).toUpperCase(),
          tax_rate: Number(map['tax.rate'] ?? prev.tax_rate),
          max_price_eur: Number(map['catalog.max_price_eur'] ?? prev.max_price_eur),
          cart_max_total_eur: Number(map['cart.max_total_eur'] ?? prev.cart_max_total_eur),
        }))
      } catch (refreshError) {
        console.warn('Settings refresh failed:', refreshError)
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
            ✅ Ayarlar başarıyla kaydedildi! Destek e-postası: {settings.support_email}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mağaza Logosu</label>
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-16 w-16 rounded-lg bg-[#1a1d24] border border-gray-700 flex items-center justify-center overflow-hidden">
                    {settings.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={settings.logo_url}
                        alt="Logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-2xl">🎮</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(file)
                      }}
                      className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ff6b35] file:px-4 file:py-2 file:text-white file:font-semibold hover:file:bg-[#f7931e]"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {uploadingLogo ? 'Yükleniyor…' : 'PNG/JPG/WEBP/SVG · en fazla 2 MB'}
                    </p>
                  </div>
                </div>
                <input
                  type="url"
                  value={settings.logo_url}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  placeholder="https://... veya /static/logo.png"
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Destek */}
          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-1">WhatsApp Destek Butonu</h2>
            <p className="text-sm text-gray-400 mb-4">
              Numara girildiğinde mağazada sağ altta WhatsApp butonu görünür. Boş bırakılırsa buton
              gizlenir.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  WhatsApp Numarası (ülke kodu ile)
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+90 555 111 22 33"
                  value={settings.whatsapp_number}
                  onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Sadece rakamlar kullanılır: +90 555 111 22 33 → 905551112233
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Ön tanımlı mesaj
                </label>
                <textarea
                  rows={2}
                  value={settings.whatsapp_message}
                  onChange={(e) => setSettings({ ...settings, whatsapp_message: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  placeholder="Merhaba, bir ürün hakkında bilgi almak istiyorum."
                />
              </div>
            </div>
          </div>

          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-1">Sosyal Medya Bağlantıları</h2>
            <p className="text-sm text-gray-400 mb-4">
              Doldurduğunuz alanlar mağaza alt bilgisinde (footer) simge olarak görünür. Boş bırakılan
              simgeler gizlenir. Adresi başında https:// olmadan da yazabilirsiniz; otomatik eklenir.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Facebook</label>
                <input
                  type="url"
                  value={settings.social_facebook}
                  onChange={(e) => setSettings({ ...settings, social_facebook: e.target.value })}
                  placeholder="https://facebook.com/magazaniz"
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Instagram</label>
                <input
                  type="url"
                  value={settings.social_instagram}
                  onChange={(e) => setSettings({ ...settings, social_instagram: e.target.value })}
                  placeholder="https://instagram.com/magazaniz"
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">X (Twitter)</label>
                <input
                  type="url"
                  value={settings.social_x}
                  onChange={(e) => setSettings({ ...settings, social_x: e.target.value })}
                  placeholder="https://x.com/magazaniz"
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={settings.social_linkedin}
                  onChange={(e) => setSettings({ ...settings, social_linkedin: e.target.value })}
                  placeholder="https://linkedin.com/company/magazaniz"
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">YouTube</label>
                <input
                  type="url"
                  value={settings.social_youtube}
                  onChange={(e) => setSettings({ ...settings, social_youtube: e.target.value })}
                  placeholder="https://youtube.com/@magazaniz"
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-1">Google Analytics</h2>
            <p className="text-sm text-gray-400 mb-4">
              GA4 ölçüm kimliğini girin (örn. G-XXXXXXXXXX). Mağazanın tüm sayfalarında ziyaret
              takibi etkinleşir. Boş bırakırsanız Analytics kodu yüklenmez.
            </p>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ölçüm Kimliği (Measurement ID)
              </label>
              <input
                type="text"
                value={settings.ga_measurement_id}
                onChange={(e) => setSettings({ ...settings, ga_measurement_id: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none font-mono"
              />
              <p className="text-xs text-gray-500 mt-2">
                Google Analytics → Yönetici → Veri Akışları → Web → Ölçüm Kimliği (G- ile başlar).
              </p>
            </div>
          </div>

          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-1">Üst Duyuru Şeridi</h2>
            <p className="text-sm text-gray-400 mb-4">
              Header’ın en üstündeki turuncu şerit. Anahtarı kapatırsanız şerit tamamen kaldırılır.
              Bir dil alanını boş bırakırsanız o dilde varsayılan metin (alanın içinde soluk görünen
              yazı) gösterilir.
            </p>

            <label className="flex items-center gap-3 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={settings.announcement_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, announcement_enabled: e.target.checked })
                }
                className="w-5 h-5 bg-[#1a1d24] border border-gray-700 rounded text-[#ff6b35] focus:ring-[#ff6b35]"
              />
              <div>
                <div className="text-white font-medium">Şeridi göster</div>
                <div className="text-sm text-gray-400">
                  Kapatıldığında üst şerit hiç görünmez.
                </div>
              </div>
            </label>

            <div className={`grid md:grid-cols-2 gap-4 ${settings.announcement_enabled ? '' : 'opacity-50'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Türkçe (TR)</label>
                <textarea
                  rows={2}
                  value={settings.announcement_tr}
                  onChange={(e) => setSettings({ ...settings, announcement_tr: e.target.value })}
                  placeholder={translate('tr', 'nav.banner')}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">İngilizce (EN)</label>
                <textarea
                  rows={2}
                  value={settings.announcement_en}
                  onChange={(e) => setSettings({ ...settings, announcement_en: e.target.value })}
                  placeholder={translate('en', 'nav.banner')}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Almanca (DE)</label>
                <textarea
                  rows={2}
                  value={settings.announcement_de}
                  onChange={(e) => setSettings({ ...settings, announcement_de: e.target.value })}
                  placeholder={translate('de', 'nav.banner')}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fransızca (FR)</label>
                <textarea
                  rows={2}
                  value={settings.announcement_fr}
                  onChange={(e) => setSettings({ ...settings, announcement_fr: e.target.value })}
                  placeholder={translate('fr', 'nav.banner')}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Arapça (AR)</label>
                <textarea
                  rows={2}
                  value={settings.announcement_ar}
                  onChange={(e) => setSettings({ ...settings, announcement_ar: e.target.value })}
                  placeholder={translate('ar', 'nav.banner')}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Listeleme Limiti */}
          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-1">Listeleme Üst Fiyat Limiti</h2>
            <p className="text-sm text-gray-400 mb-4">
              Belirtilen EUR değerinin üzerindeki ürünler mağazada listelenmez ve satın alınamaz.
            </p>

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Üst limit (EUR)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={settings.max_price_eur}
                onChange={(e) =>
                  setSettings({ ...settings, max_price_eur: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                0 yazarsanız limit kaldırılır. Örnek: 100 → 100 EUR üzeri ürünler gizlenir.
              </p>
            </div>

            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sepet üst limiti (EUR)
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={settings.cart_max_total_eur}
                onChange={(e) =>
                  setSettings({ ...settings, cart_max_total_eur: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                0 yazarsanız limit kaldırılır. Örnek: 500 → sepet toplamı 500 EUR'yu aşan sipariş oluşturulamaz.
              </p>
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

          {/* Country Tax Rates */}
          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-4">Ülke Bazlı Vergi Oranları</h2>
            <p className="text-gray-400 text-sm mb-4">
              Ülke seçildiğinde bu oranlar kullanılacaktır. Boş bırakılan ülkeler varsayılan vergi oranını kullanır.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {countryOptions.map((c) => {
                const codeLower = c.code.toLowerCase()
                const value = countryRates?.[codeLower] ?? ''
                return (
                  <div key={c.code} className="flex items-center gap-3">
                    <label className="w-40 text-sm font-medium text-gray-300">{c.label} ({c.code})</label>
                    <input
                      type="number"
                      step="0.01"
                      className="flex-1 px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                      placeholder="e.g. 20"
                      value={value}
                      onChange={(e) => {
                        const num = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0)
                        setCountryRates((prev) => ({
                          ...prev,
                          [codeLower]: (num as any),
                        }))
                      }}
                    />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Provider Currency Settings */}
          <div className="gaming-card p-6">
            <h2 className="text-xl font-bold text-white mb-4">Sağlayıcı Para Birimleri</h2>
            <p className="text-gray-400 mb-6 text-sm">
              Kinguin ve CodesWholesale entegrasyonlarından gelen fiyatların hangi para birimiyle işlendiğini seç.
              Bu ayar import ve fiyat güncelleme işlemlerinde kullanılır.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Kinguin Para Birimi
                </label>
                <select
                  value={settings.kinguin_currency}
                  onChange={(e) => setSettings({ ...settings, kinguin_currency: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                >
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CodesWholesale Para Birimi
                </label>
                <select
                  value={settings.codeswholesale_currency}
                  onChange={(e) => setSettings({ ...settings, codeswholesale_currency: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                </select>
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

        {/* Sosyal giris (Google/Facebook) ayarlari — bagimsiz kart */}
        <div className="mt-6">
          <SocialLoginCard />
        </div>

        {/* Bot korumasi (CAPTCHA) — bagimsiz kart */}
        <div className="mt-6">
          <BotProtectionCard />
        </div>

        {/* Admin giris kapisi anahtari — bagimsiz kart */}
        <div className="mt-6">
          <AdminAccessCard />
        </div>
      </div>
    </div>
  )
}

