import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { createHash, timingSafeEqual } from 'crypto'

/**
 * POST /store/admin-access/verify
 *
 * Admin panel giris kapisini dogrular. Beklenen anahtar store_settings
 * icindeki "admin.access_key" degeridir (admin panelinden degistirilir).
 * Anahtarin kendisi cevapta ASLA donmez; yalnizca kapi acik mi ve anahtar
 * dogru mu bilgisi verilir. Ayar bos ise kapi kapalidir -> enabled:false.
 */
export const AUTHENTICATE = false

const SETTING_KEY = 'admin.access_key'

// Kaba kuvvet denemelerini sinirlar: ayni IP 10 dakikada en fazla 10 hatali
// deneme yapabilir. Sayac process belleginde tutulur (tek instance icin yeterli).
const WINDOW_MS = 10 * 60 * 1000
const MAX_FAILURES = 10
const attempts = new Map<string, { count: number; resetAt: number }>()

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/** Uzunluk farkini sizdirmayan sabit zamanli karsilastirma. */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b))
}

function applyCors(req: MedusaRequest, res: MedusaResponse) {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-publishable-api-key')
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  applyCors(req, res)

  try {
    const ip =
      (req.ip as string) ||
      req.socket?.remoteAddress ||
      'unknown'
    const now = Date.now()
    const entry = attempts.get(ip)

    if (entry && entry.resetAt > now && entry.count >= MAX_FAILURES) {
      return res.status(429).json({
        message: 'Cok fazla hatali deneme. Biraz sonra tekrar deneyin.',
        enabled: true,
        valid: false,
      })
    }

    const storeSettings = req.scope.resolve('storeSettings') as any
    const setting = await storeSettings.getSetting(SETTING_KEY)
    const expected = setting?.value ? String(setting.value).trim() : ''

    // Ayar tanimli degilse kapi devre disi (ilk kurulum: panel anahtarsiz acilir)
    if (!expected) {
      return res.json({ enabled: false, valid: false })
    }

    const body = (req.body || {}) as any
    const provided = typeof body.key === 'string' ? body.key.trim() : ''
    const valid = provided.length > 0 && safeEqual(provided, expected)

    if (valid) {
      attempts.delete(ip)
    } else {
      const count = entry && entry.resetAt > now ? entry.count + 1 : 1
      const resetAt = entry && entry.resetAt > now ? entry.resetAt : now + WINDOW_MS
      attempts.set(ip, { count, resetAt })
    }

    res.json({ enabled: true, valid })
  } catch (error: any) {
    console.error('Admin access verify error:', error)
    res.status(500).json({ message: 'Dogrulama yapilamadi', valid: false })
  }
}

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  applyCors(req, res)
  res.status(204).end()
}
