import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { getAuthSettings, mintCustomerJwt, sanitizeCustomer } from '../../../../utils/auth-session'
import { clientIp, rateLimit, verifyCaptcha } from '../../../../utils/bot-protection'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any
  try {
    const { email, password, captcha_token } = (req.body || {}) as Record<string, string>
    if (!email || !password) {
      return res.status(400).json({ code: 'missing_fields', message: 'Email ve şifre gerekli' })
    }

    // Bot korumasi 1) IP rate limit — 15 dk'da 10 deneme
    const rl = rateLimit(`login:${clientIp(req)}`, 10, 15 * 60 * 1000)
    if (!rl.allowed) {
      return res.status(429).json({
        code: 'rate_limited',
        message: `Çok fazla deneme. ${Math.ceil(rl.retryAfterSec / 60)} dakika sonra tekrar deneyin.`,
      })
    }

    // Bot korumasi 2) CAPTCHA (admin panelde aciksa) — fail closed
    const captcha = await verifyCaptcha(req.scope, {
      token: captcha_token,
      action: 'login',
      ip: clientIp(req),
    })
    if (!captcha.ok) {
      return res.status(400).json({ code: captcha.reason || 'captcha_failed', message: 'Bot doğrulaması başarısız. Lütfen tekrar deneyin.' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    const authModule = req.scope.resolve(Modules.AUTH) as any
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const customers = await customerModule.listCustomers({ email: normalizedEmail })
    const customer = customers?.[0]

    if (!customer || !customer.has_account) {
      return res.status(401).json({ code: 'invalid_credentials', message: 'Geçersiz e-posta veya şifre' })
    }

    // E-posta dogrulama kapisi
    const settings = await getAuthSettings(req.scope)
    if (settings.verificationRequired && customer.metadata?.email_verified === false) {
      return res.status(403).json({
        code: 'email_not_verified',
        message: 'E-postanız doğrulanmamış. Gelen kutunuzdaki bağlantıya tıklayın.',
        email: customer.email,
      })
    }

    // 1) Medusa emailpass ile dene (hash'li sifre)
    let authIdentityId: string | null = null
    try {
      const result = await authModule.authenticate('emailpass', {
        url: req.url,
        headers: req.headers,
        query: {},
        body: { email: normalizedEmail, password },
        protocol: req.protocol,
      })
      if (result?.success && result.authIdentity) {
        authIdentityId = result.authIdentity.id
        // actor bagini garanti et
        const linked = result.authIdentity.app_metadata?.customer_id
        if (!linked) {
          await authModule.updateAuthIdentities({
            id: authIdentityId!,
            app_metadata: { customer_id: customer.id },
          })
        } else if (linked !== customer.id) {
          return res.status(401).json({ code: 'invalid_credentials', message: 'Geçersiz e-posta veya şifre' })
        }
      }
    } catch {
      /* emailpass denemesi basarisiz — legacy fallback asagida */
    }

    // 2) Legacy fallback: eski kayitlarda sifre metadata.password_hash'te (duz metin).
    //    Eslesirse Medusa emailpass identity'sine tasi (hash'li) ve JWT uret.
    if (!authIdentityId) {
      const legacyPassword = customer.metadata?.password_hash
      if (!legacyPassword || legacyPassword !== password) {
        return res.status(401).json({ code: 'invalid_credentials', message: 'Geçersiz e-posta veya şifre' })
      }
      logger.info(`[auth] legacy sifre migrasyonu: ${normalizedEmail}`)
      try {
        const reg = await authModule.register('emailpass', {
          url: req.url,
          headers: req.headers,
          query: {},
          body: { email: normalizedEmail, password },
          protocol: req.protocol,
        })
        if (reg?.success && reg.authIdentity) {
          authIdentityId = reg.authIdentity.id
        }
      } catch {
        // identity zaten vardi (baska sifreyle) — provider_identities'tan bul
        try {
          const identities = await authModule.listAuthIdentities(
            {},
            { relations: ['provider_identities'], take: 1000 }
          )
          const own = (identities || []).find((i: any) =>
            (i.provider_identities || []).some(
              (pi: any) => pi.provider === 'emailpass' && pi.entity_id === normalizedEmail
            )
          )
          authIdentityId = own?.id || null
        } catch {
          authIdentityId = null
        }
      }
      if (authIdentityId) {
        await authModule
          .updateAuthIdentities({ id: authIdentityId, app_metadata: { customer_id: customer.id } })
          .catch(() => null)
        // duz metin sifreyi metadata'dan temizle
        await customerModule
          .updateCustomers(customer.id, { metadata: { ...(customer.metadata || {}), password_hash: null } })
          .catch(() => null)
      }
    }

    if (!authIdentityId) {
      // kimlik tasiyorumamadi — yine de oturum JWT'si uret (auth_identity yok ama actor biliniyor)
      authIdentityId = ''
    }

    const token = mintCustomerJwt(req.scope, {
      customerId: customer.id,
      authIdentityId,
    })

    res.json({ token, customer: sanitizeCustomer(customer) })
  } catch (error: any) {
    logger.error(`[auth] login hatasi: ${error?.message}`)
    res.status(500).json({ code: 'login_failed', message: 'Giriş yapılamadı' })
  }
}
