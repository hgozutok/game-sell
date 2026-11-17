// Admin panel giris kapisi.
//
// Panel yalnizca URL'de gizli anahtar varken acilir: /admin?key=<anahtar>.
// Anahtar store_settings icindeki "admin.access_key" ayarindan gelir ve admin
// panelindeki Magaza Ayarlari sayfasindan degistirilebilir. Ayar bos ise kapi
// devre disidir (ilk kurulumda panele girebilmek icin).

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ''

/** URL'de beklenen parametre adi: /admin?key=... */
export const ADMIN_ACCESS_PARAM = 'key'

/** Anahtarin tutuldugu sekme deposu (sekme kapaninca silinir). */
export const ADMIN_ACCESS_STORAGE_KEY = 'admin_access_key'

export type AdminAccessState = 'disabled' | 'valid' | 'invalid'

/**
 * Anahtari backend'de dogrular. Anahtarin kendisi cevapta donmez; yalnizca
 * "kapi acik mi" ve "anahtar dogru mu" bilgisi gelir.
 */
export async function verifyAdminAccessKey(key: string): Promise<AdminAccessState> {
  try {
    const res = await fetch(`${API_URL}/store/admin-access/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {}),
      },
      body: JSON.stringify({ key }),
      cache: 'no-store',
    })

    if (!res.ok) return 'invalid'

    const data = (await res.json()) as { enabled?: boolean; valid?: boolean }
    if (data?.enabled === false) return 'disabled'
    return data?.valid ? 'valid' : 'invalid'
  } catch {
    return 'invalid'
  }
}

export function storeAdminAccessKey(key: string): void {
  if (typeof window === 'undefined' || !key) return
  try {
    window.sessionStorage.setItem(ADMIN_ACCESS_STORAGE_KEY, key)
  } catch {
    /* private mode */
  }
}

export function getStoredAdminAccessKey(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.sessionStorage.getItem(ADMIN_ACCESS_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function clearAdminAccessKey(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(ADMIN_ACCESS_STORAGE_KEY)
  } catch {
    /* private mode */
  }
}
