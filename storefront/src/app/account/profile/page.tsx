'use client'

// Profil sayfasi: ad/soyad guncelleme, sifre degistirme, fatura (invoice) bilgileri.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/components/useT'

interface BillingInfo {
  company?: string
  tax_number?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
}

export default function ProfilePage() {
  const t = useT()
  const { customer, refreshCustomer } = useAuth()

  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savingPw, setSavingPw] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')

  const [billingMsg, setBillingMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savingBilling, setSavingBilling] = useState(false)
  const [billing, setBilling] = useState<BillingInfo>({})

  useEffect(() => {
    if (!customer) return
    setFirstName(customer.first_name || '')
    setLastName(customer.last_name || '')
    setEmail(customer.email || '')
    const loadBilling = async () => {
      try {
        const res = await api.get('/store/customers/me')
        setBilling(res.data?.customer?.metadata?.billing || {})
      } catch {
        /* metadata bos olabilir */
      }
    }
    void loadBilling()
  }, [customer])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      await api.post('/store/customers/me', {
        first_name: firstName,
        last_name: lastName,
      })
      await refreshCustomer()
      setProfileMsg({ ok: true, text: 'Bilgileriniz güncellendi.' })
    } catch (err: any) {
      setProfileMsg({ ok: false, text: err?.response?.data?.message || 'Kaydedilemedi.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== newPassword2) {
      setPwMsg({ ok: false, text: 'Yeni şifreler eşleşmiyor.' })
      return
    }
    setSavingPw(true)
    setPwMsg(null)
    try {
      await api.post('/store/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setPwMsg({ ok: true, text: 'Şifreniz güncellendi.' })
      setCurrentPassword('')
      setNewPassword('')
      setNewPassword2('')
    } catch (err: any) {
      setPwMsg({ ok: false, text: err?.response?.data?.message || 'Şifre değiştirilemedi.' })
    } finally {
      setSavingPw(false)
    }
  }

  const saveBilling = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingBilling(true)
    setBillingMsg(null)
    try {
      const current = await api.get('/store/customers/me')
      await api.post('/store/customers/me', {
        metadata: {
          ...(current.data?.customer?.metadata || {}),
          billing,
        },
      })
      setBillingMsg({ ok: true, text: 'Fatura bilgileri kaydedildi.' })
    } catch (err: any) {
      setBillingMsg({ ok: false, text: err?.response?.data?.message || 'Kaydedilemedi.' })
    } finally {
      setSavingBilling(false)
    }
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Profilinizi görmek için giriş yapmalısınız.</p>
          <Link href="/login" className="text-[#ff6b35] hover:underline">
            Giriş Yap →
          </Link>
        </div>
      </div>
    )
  }

  const inputClass =
    'w-full bg-[#1a1d24] border border-gray-700 text-white px-3 py-2.5 rounded-lg focus:border-[#ff6b35] focus:outline-none text-sm'
  const labelClass = 'block text-gray-400 text-sm mb-1.5'

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Profilim</h1>
          <div className="w-16 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-3"></div>
          <p className="text-gray-400 text-sm">
            Hesap bilgileri, şifre ve fatura bilgileri yönetimi — {email}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Profil bilgileri */}
        <section className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">👤 Hesap Bilgileri</h2>
          {profileMsg && (
            <p className={`mb-3 text-sm ${profileMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {profileMsg.text}
            </p>
          )}
          <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Ad</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Soyad</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>E-posta (değiştirilemez)</label>
              <input value={email} disabled className={`${inputClass} opacity-60`} />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-[#ff6b35] hover:bg-[#e55a2b] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg text-sm"
              >
                {savingProfile ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </section>

        {/* Sifre degistirme */}
        <section className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">🔒 Şifre Değiştir</h2>
          {pwMsg && (
            <p className={`mb-3 text-sm ${pwMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{pwMsg.text}</p>
          )}
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className={labelClass}>Mevcut Şifre</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Yeni Şifre (min 8 karakter)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Yeni Şifre (tekrar)</label>
                <input
                  type="password"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  required
                  minLength={8}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingPw}
              className="bg-[#ff6b35] hover:bg-[#e55a2b] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg text-sm"
            >
              {savingPw ? 'Kaydediliyor…' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </section>

        {/* Fatura bilgileri */}
        <section className="bg-[#15171c] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">🧾 Fatura Bilgileri</h2>
          <p className="text-gray-400 text-sm mb-4">
            Siparişlerinizde fatura kesebilmesi için bilgilerinizi doldurun (opsiyonel).
          </p>
          {billingMsg && (
            <p className={`mb-3 text-sm ${billingMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {billingMsg.text}
            </p>
          )}
          <form onSubmit={saveBilling} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Şirket Adı</label>
              <input
                value={billing.company || ''}
                onChange={(e) => setBilling({ ...billing, company: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Vergi / VAT Numarası</label>
              <input
                value={billing.tax_number || ''}
                onChange={(e) => setBilling({ ...billing, tax_number: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Adres</label>
              <input
                value={billing.address || ''}
                onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Şehir</label>
              <input
                value={billing.city || ''}
                onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Posta Kodu</label>
              <input
                value={billing.postal_code || ''}
                onChange={(e) => setBilling({ ...billing, postal_code: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ülke</label>
              <input
                value={billing.country || ''}
                onChange={(e) => setBilling({ ...billing, country: e.target.value })}
                placeholder="DE"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={savingBilling}
                className="bg-[#ff6b35] hover:bg-[#e55a2b] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg text-sm"
              >
                {savingBilling ? 'Kaydediliyor…' : 'Fatura Bilgilerini Kaydet'}
              </button>
            </div>
          </form>
        </section>

        {/* Hizli baglantilar */}
        <div className="flex gap-4">
          <Link href="/account/orders" className="text-[#ff6b35] hover:underline text-sm">
            📦 Siparişlerim →
          </Link>
          <Link href="/account/keys" className="text-[#ff6b35] hover:underline text-sm">
            🔑 Anahtarlarım →
          </Link>
        </div>
      </div>
    </div>
  )
}
