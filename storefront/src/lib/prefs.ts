// Kullanici tercihleri (dil, kur, pazarlama izinleri, wishlist) — hesaba kaydetme.
// Girisliysen backend customer.metadata.prefs'e, degilse yalnizca yerel aynaya yazilir.
import { api } from '@/lib/api'

const LOCAL_KEY = 'user-prefs-local'

export interface UserPrefs {
  currency?: string
  locale?: string
  email_marketing?: boolean
  sms_marketing?: boolean
  wishlist?: string[]
}

export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('customer_id')
}

export function getLocalPrefs(): UserPrefs {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
  } catch {
    return {}
  }
}

function setLocalPrefs(prefs: UserPrefs) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs))
}

const timers: Record<string, ReturnType<typeof setTimeout>> = {}

/**
 * Tercihleri kaydeder. Girisli kullanici icin backend'e (debounce 800ms),
 * her durumda yerel aynaya yazar.
 */
export function saveUserPrefs(partial: UserPrefs): UserPrefs {
  const merged = { ...getLocalPrefs(), ...partial }
  setLocalPrefs(merged)

  if (!isLoggedIn()) return merged

  const key = 'prefs-post'
  if (timers[key]) clearTimeout(timers[key])
  timers[key] = setTimeout(() => {
    api
      .post('/store/customers/me', { metadata: { prefs: getLocalPrefs() } })
      .catch(() => {})
  }, 800)

  return merged
}

/** Giris sonrasi / sayfa yuklemesinde backend'den gelen tercihleri döndürür */
export function prefsFromCustomer(customer: any): UserPrefs {
  return (customer?.metadata?.prefs as UserPrefs) || {}
}

/** Konuk kullaniciyi yeni hesaba tasir (register/login sonrasi cagirilir) */
export function carryGuestPrefsToAccount(): UserPrefs {
  if (isLoggedIn()) {
    const local = getLocalPrefs()
    if (Object.keys(local).length) {
      saveUserPrefs(local)
    }
    return local
  }
  return getLocalPrefs()
}
