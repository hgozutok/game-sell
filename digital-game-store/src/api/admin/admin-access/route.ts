import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

/**
 * GET/POST /admin/admin-access
 *
 * Admin panel giris kapisi anahtari. Bu uc nokta varsayilan olarak admin
 * oturumu ister (AUTHENTICATE yazilmadigi icin true). Anahtar, herkese acik
 * olan GET /admin/settings yanitindan filtrelenir; buradan okunur.
 */

const SETTING_KEY = 'admin.access_key'

function readBody(req: MedusaRequest): { key: string } {
  const body = (req.body || {}) as any
  return { key: typeof body.key === 'string' ? body.key : '' }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettings = req.scope.resolve('storeSettings') as any
  const setting = await storeSettings.getSetting(SETTING_KEY)
  const key = setting?.value ? String(setting.value) : ''

  res.json({ enabled: Boolean(key), key })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettings = req.scope.resolve('storeSettings') as any
  const { key } = readBody(req)
  const value = key.trim()

  if (!value) {
    await storeSettings.deleteSetting(SETTING_KEY)
    return res.json({ enabled: false, key: '' })
  }

  await storeSettings.setSetting(SETTING_KEY, value, {
    category: 'security',
    description: 'Admin panel giris URL anahtari (/admin?key=...)',
  })

  res.json({ enabled: true, key: value })
}
