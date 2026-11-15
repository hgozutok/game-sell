'use client'

// Sosyal giris (Google/Facebook) ayarlari — kendi yukleme/kaydetme akisina sahip kart.
// Ayarlar store_settings tablosuna auth.<provider>.* anahtarlarıyla yazilir;
// OAuth endpoint'leri (/store/auth/oauth/*) bu ayarlari canli okur.
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'

interface ProviderState {
  enabled: boolean
  client_id: string
  client_secret: string
}

const PROVIDERS: Array<{ id: 'google' | 'facebook'; label: string; hint: string }> = [
  { id: 'google', label: 'Google', hint: 'Google Cloud Console → OAuth 2.0 Client ID (Web)' },
  { id: 'facebook', label: 'Facebook', hint: 'Meta for Developers → Facebook Login (Web)' },
]

const EMPTY: ProviderState = { enabled: false, client_id: '', client_secret: '' }

export default function SocialLoginCard() {
  const [providers, setProviders] = useState<Record<string, ProviderState>>({
    google: { ...EMPTY },
    facebook: { ...EMPTY },
  })
  const [frontendUrl, setFrontendUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminApi.get('/admin/settings')
        const list: Array<{ key: string; value: any }> = response.data?.settings || []
        const map: Record<string, any> = {}
        list.forEach((item) => {
          map[item.key] = item.value
        })
        setProviders({
          google: {
            enabled: map['auth.google.enabled'] === true || map['auth.google.enabled'] === 'true',
            client_id: map['auth.google.client_id'] ?? '',
            client_secret: map['auth.google.client_secret'] ?? '',
          },
          facebook: {
            enabled: map['auth.facebook.enabled'] === true || map['auth.facebook.enabled'] === 'true',
            client_id: map['auth.facebook.client_id'] ?? '',
            client_secret: map['auth.facebook.client_secret'] ?? '',
          },
        })
        setFrontendUrl(String(map['auth.frontend_url'] ?? ''))
      } catch {
        setMessage({ type: 'error', text: 'Ayarlar yüklenemedi' })
      }
    }
    void load()
  }, [])

  const save = async () => {
    try {
      setSaving(true)
      setMessage(null)
      const settings: Array<{ key: string; value: any }> = [
        { key: 'auth.frontend_url', value: frontendUrl },
      ]
      for (const p of PROVIDERS) {
        const st = providers[p.id]
        settings.push({ key: `auth.${p.id}.enabled`, value: st.enabled })
        settings.push({ key: `auth.${p.id}.client_id`, value: st.client_id })
        if (st.client_secret) {
          settings.push({ key: `auth.${p.id}.client_secret`, value: st.client_secret })
        }
      }
      await adminApi.post('/admin/settings/batch', { settings })
      setMessage({ type: 'ok', text: 'Sosyal giriş ayarları kaydedildi' })
    } catch {
      setMessage({ type: 'error', text: 'Kaydedilemedi' })
    } finally {
      setSaving(false)
    }
  }

  const update = (id: string, patch: Partial<ProviderState>) => {
    setProviders((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  const backendOrigin =
    typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
      ? process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
      : 'http://localhost:9000'

  return (
    <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">Sosyal Giriş</h3>
          <p className="text-gray-400 text-sm">
            Google / Facebook ile giriş için OAuth kimlik bilgileri. Yetkilendirme
            yönlendirme adresi: <code className="text-[#ff6b35]">{backendOrigin}/auth/oauth/&lt;provider&gt;/callback</code>
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-gray-400 text-sm mb-1">Storefront adresi (sonuç yönlendirmesi)</label>
          <input
            value={frontendUrl}
            onChange={(e) => setFrontendUrl(e.target.value)}
            placeholder="http://localhost:3000"
            className="w-full bg-[#0a0b0d] border border-gray-700 text-white px-3 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm"
          />
        </div>

        {PROVIDERS.map((p) => (
          <div key={p.id} className="border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-semibold">{p.label}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={providers[p.id].enabled}
                  onChange={(e) => update(p.id, { enabled: e.target.checked })}
                  className="accent-[#ff6b35]"
                />
                <span className="text-gray-400 text-sm">Aktif</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 text-xs mb-1">Client ID</label>
                <input
                  value={providers[p.id].client_id}
                  onChange={(e) => update(p.id, { client_id: e.target.value })}
                  className="w-full bg-[#0a0b0d] border border-gray-700 text-white px-3 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-xs mb-1">
                  Client Secret {providers[p.id].client_secret ? '(kayıtlı — değiştirmek için yeniden yazın)' : ''}
                </label>
                <input
                  type="password"
                  value={providers[p.id].client_secret}
                  onChange={(e) => update(p.id, { client_secret: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#0a0b0d] border border-gray-700 text-white px-3 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm"
                />
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-2">{p.hint}</p>
          </div>
        ))}
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
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
