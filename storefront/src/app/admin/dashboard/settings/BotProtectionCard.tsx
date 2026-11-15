'use client'

// Bot korumasi (CAPTCHA) ayarlari: Turnstile / reCAPTCHA v2 / kapali.
// Ayarlar store_settings auth.captcha.* anahtarlarina yazilir; register ve login
// endpoint'leri token'i saglayicinin siteverify uc noktasinda dogrular (fail closed).
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

const KEYS = {
  provider: 'auth.captcha.provider',
  turnstileSite: 'auth.captcha.turnstile_site_key',
  turnstileSecret: 'auth.captcha.turnstile_secret_key',
  recaptchaSite: 'auth.captcha.recaptcha_site_key',
  recaptchaSecret: 'auth.captcha.recaptcha_secret_key',
}

export default function BotProtectionCard() {
  const [provider, setProvider] = useState('none')
  const [turnstileSite, setTurnstileSite] = useState('')
  const [turnstileSecret, setTurnstileSecret] = useState('')
  const [recaptchaSite, setRecaptchaSite] = useState('')
  const [recaptchaSecret, setRecaptchaSecret] = useState('')
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
        setProvider(String(map[KEYS.provider] || 'none'))
        setTurnstileSite(String(map[KEYS.turnstileSite] || ''))
        setTurnstileSecret(String(map[KEYS.turnstileSecret] || ''))
        setRecaptchaSite(String(map[KEYS.recaptchaSite] || ''))
        setRecaptchaSecret(String(map[KEYS.recaptchaSecret] || ''))
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
      await adminApi.post('/admin/settings/batch', {
        settings: [
          { key: KEYS.provider, value: provider },
          { key: KEYS.turnstileSite, value: turnstileSite },
          ...(turnstileSecret ? [{ key: KEYS.turnstileSecret, value: turnstileSecret }] : []),
          { key: KEYS.recaptchaSite, value: recaptchaSite },
          ...(recaptchaSecret ? [{ key: KEYS.recaptchaSecret, value: recaptchaSecret }] : []),
        ],
      })
      setMessage({ ok: true, text: 'Bot koruması ayarları kaydedildi' })
    } catch {
      setMessage({ ok: false, text: 'Kaydedilemedi' })
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-[#0a0b0d] border border-gray-700 text-white px-3 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm'
  const labelClass = 'block text-gray-400 text-xs mb-1'

  return (
    <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
      <h3 className="text-white font-bold text-lg mb-2">Bot Koruması (CAPTCHA)</h3>
      <p className="text-gray-400 text-sm mb-4">
        Kayıt ve girişte bot doğrulaması. Turnstile (Cloudflare, ücretsiz) önerilir;
        widget anahtarlarını Cloudflare panelden alıp buraya girin.
      </p>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Sağlayıcı</label>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass}>
            <option value="none">Kapalı</option>
            <option value="turnstile">Cloudflare Turnstile</option>
            <option value="recaptcha">Google reCAPTCHA v2</option>
          </select>
        </div>

        {provider === 'turnstile' && (
          <div className="border border-gray-800 rounded-lg p-4 space-y-3">
            <div className="text-white font-semibold">Turnstile</div>
            <div>
              <label className={labelClass}>Site Key (public)</label>
              <input value={turnstileSite} onChange={(e) => setTurnstileSite(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Secret Key</label>
              <input
                type="password"
                value={turnstileSecret}
                onChange={(e) => setTurnstileSecret(e.target.value)}
                placeholder={turnstileSecret ? '••••••••' : ''}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {provider === 'recaptcha' && (
          <div className="border border-gray-800 rounded-lg p-4 space-y-3">
            <div className="text-white font-semibold">reCAPTCHA v2</div>
            <div>
              <label className={labelClass}>Site Key (public)</label>
              <input value={recaptchaSite} onChange={(e) => setRecaptchaSite(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Secret Key</label>
              <input
                type="password"
                value={recaptchaSecret}
                onChange={(e) => setRecaptchaSecret(e.target.value)}
                placeholder={recaptchaSecret ? '••••••••' : ''}
                className={inputClass}
              />
            </div>
          </div>
        )}

        <p className="text-gray-500 text-xs">
          Turnstile redirect/host ayarı gerekmez; widget localhost üzerinde de çalışır.
        </p>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.ok ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>
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
