import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { clientIp, rateLimit } from '../../../../utils/bot-protection'

// POST /store/auth/reset-password — token ile yeni şifre belirleme
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any

  try {
    const { token, password } = (req.body || {}) as Record<string, string>
    if (!token || typeof token !== 'string' || token.length > 200) {
      return res.status(400).json({ code: 'missing_token', message: 'Geçersiz şifre sıfırlama bağlantısı' })
    }
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 256) {
      return res.status(400).json({ code: 'invalid_password', message: 'Yeni şifre 8 ile 256 karakter arasında olmalıdır' })
    }

    const ip = clientIp(req)
    const ipRl = rateLimit(`reset-pw:ip:${ip}`, 5, 15 * 60 * 1000)
    if (!ipRl.allowed) {
      return res.status(429).json({
        code: 'rate_limited',
        message: `Çok fazla deneme. Lütfen ${Math.ceil(ipRl.retryAfterSec / 60)} dakika sonra tekrar deneyin.`,
      })
    }

    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const authModule = req.scope.resolve(Modules.AUTH) as any

    let customerId: string | null = null
    try {
      const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
      const row = await knex('customer')
        .whereNull('deleted_at')
        .whereRaw("metadata->>'password_reset_token' = ?", [token])
        .first('id')
      customerId = row?.id || null
    } catch {
      customerId = null
    }

    if (!customerId) {
      return res.status(400).json({
        code: 'invalid_token',
        message: 'Şifre sıfırlama bağlantısı geçersiz veya daha önce kullanılmış.',
      })
    }

    const customer = await customerModule.retrieveCustomer(customerId).catch(() => null)
    if (!customer) {
      return res.status(400).json({ code: 'invalid_token', message: 'Kullanıcı bulunamadı.' })
    }

    const expires = customer.metadata?.password_reset_expires
    if (!expires || new Date(expires).getTime() < Date.now()) {
      return res.status(400).json({
        code: 'expired_token',
        message: 'Şifre sıfırlama bağlantısının süresi dolmuş. Lütfen yeni bir bağlantı talep edin.',
      })
    }

    const email = customer.email.toLowerCase()

    // 1) Medusa Auth emailpass provider şifresini güncelle
    let updated = false
    try {
      await authModule.updateProvider('emailpass', {
        entity_id: email,
        password,
      })
      updated = true
    } catch {
      // Identity yoksa veya updateProvider hata verdiyse register dene
      try {
        const reg = await authModule.register('emailpass', {
          url: req.url,
          headers: req.headers,
          query: {},
          body: { email, password },
          protocol: req.protocol,
        })
        if (reg?.success && reg.authIdentity) {
          await authModule.updateAuthIdentities({
            id: reg.authIdentity.id,
            app_metadata: { customer_id: customer.id },
          }).catch(() => null)
          updated = true
        }
      } catch {
        updated = false
      }
    }

    if (!updated) {
      logger.error(`[auth] sifre sifirlanamadi (auth module): ${email}`)
      return res.status(500).json({ code: 'reset_failed', message: 'Şifre güncellenemedi, lütfen destekle iletişime geçin.' })
    }

    // 2) Token ve eski legacy password_hash alanlarını temizle
    await customerModule.updateCustomers(customer.id, {
      metadata: {
        ...(customer.metadata || {}),
        password_reset_token: null,
        password_reset_expires: null,
        password_hash: null,
      },
    })

    logger.info(`[auth] sifre basariyla sifirlandi: ${email}`)
    return res.json({ success: true, message: 'Şifreniz başarıyla sıfırlandı. Artık yeni şifrenizle giriş yapabilirsiniz.' })
  } catch (error: any) {
    logger.error(`[auth] reset-password hatasi: ${error?.message}`)
    return res.status(500).json({ code: 'reset_failed', message: 'Şifre sıfırlanamadı.' })
  }
}
