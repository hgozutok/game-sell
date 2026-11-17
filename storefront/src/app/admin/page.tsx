import { notFound } from 'next/navigation'
import AdminLoginForm from './AdminLoginForm'

// URL'deki anahtar her istekte okunur; sayfa onbelleklenmemeli.
export const dynamic = 'force-dynamic'

const API_URL =
  process.env.MEDUSA_BACKEND_URL_SERVER ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ''

type GateState = 'disabled' | 'valid' | 'invalid'

/**
 * Admin kapisini backend'de dogrular. Anahtar store_settings icindeki
 * "admin.access_key" degerinden gelir (admin panelinden degistirilebilir).
 * Ayar bos ise 'disabled' doner: panel anahtarsiz da acilir.
 */
async function checkAdminAccess(key: string): Promise<GateState> {
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
    // Backend'e ulasilamiyorsa kapi kapali kalir (fail closed).
    return 'invalid'
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const rawKey = searchParams?.key
  const key = typeof rawKey === 'string' ? rawKey.trim() : ''
  const gate = await checkAdminAccess(key)

  if (gate === 'invalid') {
    notFound()
  }

  return <AdminLoginForm gateKey={gate === 'valid' ? key : ''} />
}
