'use client'

// Admin panel giris kapisi ayari.
// Panel yalnizca /admin?key=<anahtar> adresiyle acilir; anahtar burada
// belirlenir ve store_settings icindeki "admin.access_key" degerine yazilir.
// Alan bos birakilirsa kapi devre disi kalir (panel anahtarsiz acilir).
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

function generateKey(): string {
  // 32 karakterlik hex anahtar
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export default function AdminAccessCard() {
  const [accessKey, setAccessKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminApi.get('/admin/admin-access')
        const value = response.data?.key ? String(response.data.key) : ''
        setAccessKey(value)
        setSavedKey(value)
      } catch {
        setMessage({ ok: false, text: 'Ayar yüklenemedi' })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const save = async () => {
    try {
      setSaving(true)
      setMessage(null)
      const value = accessKey.trim()
      const res = await adminApi.post('/admin/admin-access', { key: value })
      const saved = res.data?.key ? String(res.data.key) : ''
      setAccessKey(saved)
      setSavedKey(saved)
      setMessage({
        ok: true,
        text: value
          ? 'Anahtar kaydedildi. Panel artık yalnızca bu adresten açılır.'
          : 'Anahtar temizlendi. Panel anahtarsız (herkese açık) durumda.',
      })
    } catch {
      setMessage({ ok: false, text: 'Kaydedilemedi' })
    } finally {
      setSaving(false)
    }
  }

  const adminUrl =
    typeof window !== 'undefined' && savedKey
      ? `${window.location.origin}/admin?key=${encodeURIComponent(savedKey)}`
      : ''

  const copyUrl = async () => {
    if (!adminUrl) return
    try {
      await navigator.clipboard.writeText(adminUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage({ ok: false, text: 'Panoya kopyalanamadı, adresi elle seçin' })
    }
  }

  const inputClass =
    'w-full bg-[#0a0b0d] border border-gray-700 text-white px-3 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm font-mono'
  const labelClass = 'block text-gray-400 text-xs mb-1'

  return (
    <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
      <h3 className="text-white font-bold text-lg mb-2">Admin Erişim Anahtarı</h3>
      <p className="text-gray-400 text-sm mb-4">
        Admin paneli yalnızca <code className="text-[#ff6b35]">/admin?key=…</code> adresiyle
        açılır. Adreste anahtar yoksa veya yanlışsa panel sayfası hiç yüklenmez (404).
        Anahtarı buradan değiştirebilirsiniz; değişiklik anında geçerli olur.
      </p>

      {loading ? (
        <div className="text-gray-500 text-sm">Yükleniyor…</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className={labelClass} htmlFor="admin-access-key">
              Gizli anahtar (boş = kapı kapalı)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="admin-access-key"
                type="text"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="ör. 9f2c1a7d84b3e6510af8c42d57b9e630"
                className={inputClass}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setAccessKey(generateKey())}
                className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg text-sm hover:border-[#ff6b35] transition whitespace-nowrap"
              >
                🎲 Üret
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Büyük/küçük harfe duyarlıdır. Boş bırakıp kaydederseniz panel anahtarsız açılır.
            </p>
          </div>

          {adminUrl && (
            <div>
              <label className={labelClass}>Giriş adresi</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input readOnly value={adminUrl} className={inputClass} onFocus={(e) => e.target.select()} />
                <button
                  type="button"
                  onClick={copyUrl}
                  className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg text-sm hover:border-[#ff6b35] transition whitespace-nowrap"
                >
                  {copied ? '✓ Kopyalandı' : '📋 Kopyala'}
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Bu adresi yer imine ekleyin; anahtar sekme kapanınca unutulur.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            {message && (
              <span className={`text-sm ${message.ok ? 'text-green-400' : 'text-red-400'}`}>
                {message.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
