// Bot korumasi: CAPTCHA (Cloudflare Turnstile / Google reCAPTCHA v2) dogrulamasi
// + IP bazli basit rate limit (in-memory, sliding window).
// Ayar anahtarlari (admin panel):
//   auth.captcha.provider                  = none | turnstile | recaptcha
//   auth.captcha.turnstile_site_key        / turnstile_secret_key
//   auth.captcha.recaptcha_site_key        / recaptcha_secret_key
// Siteverify canonical pattern: success === true + action eslesmesi; hatalarda fail-closed.

export interface CaptchaSettings {
  provider: 'none' | 'turnstile' | 'recaptcha'
  turnstileSiteKey: string
  turnstileSecretKey: string
  recaptchaSiteKey: string
  recaptchaSecretKey: string
}

export async function getCaptchaSettings(scope: any): Promise<CaptchaSettings> {
  const storeSettings = scope.resolve('storeSettings') as any
  const getVal = async (key: string): Promise<any> => {
    try {
      return await storeSettings.getSettingValue(key, null)
    } catch {
      return null
    }
  }
  const provider = String(await getVal('auth.captcha.provider') || 'none').toLowerCase()
  return {
    provider: provider === 'turnstile' || provider === 'recaptcha' ? (provider as CaptchaSettings['provider']) : 'none',
    turnstileSiteKey: String(await getVal('auth.captcha.turnstile_site_key') || ''),
    turnstileSecretKey: String(await getVal('auth.captcha.turnstile_secret_key') || ''),
    recaptchaSiteKey: String(await getVal('auth.captcha.recaptcha_site_key') || ''),
    recaptchaSecretKey: String(await getVal('auth.captcha.recaptcha_secret_key') || ''),
  }
}

export interface CaptchaVerifyResult {
  ok: boolean
  reason?: string
}

/**
 * Token'i saglayicinin siteverify uc noktasinda dogrular.
 * action: kullanilan yuzey ('register' / 'login') — turnstile action ile eslesir.
 * Token yok/yanlis, saglayici yanit hatali veya success=false ise ok:false (fail-closed).
 */
export async function verifyCaptcha(
  scope: any,
  params: { token: unknown; action: string; ip?: string | null }
): Promise<CaptchaVerifyResult> {
  const settings = await getCaptchaSettings(scope)
  if (settings.provider === 'none') {
    return { ok: true }
  }

  const token = typeof params.token === 'string' ? params.token.trim() : ''
  if (!token || token.length > 2048) {
    return { ok: false, reason: 'captcha_token_missing' }
  }

  try {
    let verifyUrl: string
    const body = new URLSearchParams({ secret: '', response: token })
    if (settings.provider === 'turnstile') {
      if (!settings.turnstileSecretKey) return { ok: false, reason: 'captcha_not_configured' }
      verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      body.set('secret', settings.turnstileSecretKey)
    } else {
      if (!settings.recaptchaSecretKey) return { ok: false, reason: 'captcha_not_configured' }
      verifyUrl = 'https://www.google.com/recaptcha/api/siteverify'
      body.set('secret', settings.recaptchaSecretKey)
    }
    if (params.ip) body.set('remoteip', params.ip)

    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return { ok: false, reason: 'captcha_verify_error' }
    }
    const result: any = await res.json()
    if (!result?.success) {
      return { ok: false, reason: 'captcha_failed' }
    }
    // Turnstile action dogrulamasi (recaptcha v2 action donmez — atlanir)
    if (settings.provider === 'turnstile' && result.action && result.action !== params.action) {
      return { ok: false, reason: 'captcha_action_mismatch' }
    }
    return { ok: true }
  } catch {
    // network/siteverify hatasi — fail closed
    return { ok: false, reason: 'captcha_verify_error' }
  }
}

// ---- IP bazli rate limit (in-memory sliding window) ----
// Dev sunucu restart'inda sifirlanir; tek instance icin yeterli.
interface Bucket {
  hits: number[]
}
const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  const bucket = buckets.get(key) || { hits: [] }
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs)
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0]
    buckets.set(key, bucket)
    return { allowed: false, retryAfterSec: Math.ceil((windowMs - (now - oldest)) / 1000) }
  }
  bucket.hits.push(now)
  buckets.set(key, bucket)
  // eski bucket'ları arada temizle (bellek sogurması)
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) {
      if (b.hits.every((t) => now - t > windowMs)) buckets.delete(k)
    }
  }
  return { allowed: true, retryAfterSec: 0 }
}

export function clientIp(req: any): string {
  const fwd = req.headers?.['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim()
  return req.ip || 'unknown'
}
