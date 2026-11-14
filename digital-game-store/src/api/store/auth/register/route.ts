import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { createCustomerAccountWorkflow } from '@medusajs/core-flows'
import { randomToken, sanitizeCustomer } from '../../../../utils/auth-session'
import { sendTemplateEmail } from '../../../../utils/email'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any
  try {
    const { email, password, first_name, last_name } = (req.body || {}) as Record<string, string>

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ code: 'invalid_email', message: 'Geçerli bir e-posta gerekli' })
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ code: 'weak_password', message: 'Şifre en az 8 karakter olmalı' })
    }
    if (!first_name || !last_name) {
      return res.status(400).json({ code: 'missing_name', message: 'Ad ve soyad gerekli' })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const authModule = req.scope.resolve(Modules.AUTH) as any
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const existing = await customerModule.listCustomers({ email: normalizedEmail })
    if (existing?.length && existing[0].has_account) {
      return res.status(409).json({ code: 'duplicate_error', message: 'Bu e-posta ile bir hesap zaten var' })
    }

    // 1) emailpass auth identity (sifre Medusa tarafinda hash'lenir)
    const reg = await authModule.register('emailpass', {
      url: req.url,
      headers: req.headers,
      query: {},
      body: { email: normalizedEmail, password },
      protocol: req.protocol,
    })
    if (!reg?.success || !reg.authIdentity) {
      return res.status(400).json({ code: 'registration_failed', message: reg?.error || 'Kayıt oluşturulamadı' })
    }

    // 2) customer olustur ve auth identity'ye bagla (actor linki)
    const { result: customer } = await createCustomerAccountWorkflow(req.scope).run({
      input: {
        authIdentityId: reg.authIdentity.id,
        customerData: {
          email: normalizedEmail,
          first_name: String(first_name).substring(0, 80),
          last_name: String(last_name).substring(0, 80),
        },
      },
    })

    // 3) e-posta dogrulamasi (ayarliysa)
    const { getAuthSettings } = await import('../../../../utils/auth-session')
    const settings = await getAuthSettings(req.scope)
    let requiresVerification = false
    if (settings.verificationRequired) {
      requiresVerification = true
      const token = randomToken(32)
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await customerModule.updateCustomers(customer.id, {
        metadata: {
          ...(customer.metadata || {}),
          email_verified: false,
          email_verification_token: token,
          email_verification_expires: expires,
        },
      })
      const origin = req.headers.origin || settings.frontendUrl
      const verificationUrl = `${String(origin).replace(/\/+$/, '')}/verify-email?token=${token}`
      void sendTemplateEmail(req.scope, {
        to: normalizedEmail,
        templateKey: 'verify-email',
        data: {
          first_name: String(first_name),
          verification_url: verificationUrl,
          expires_hours: 24,
        },
        silent: true,
      }).catch((e: any) => logger.warn(`[auth] dogrulama e-postasi gonderilemedi: ${e?.message}`))
      logger.info(`[auth] kayit + dogrulama e-postasi: ${normalizedEmail}`)
    }

    res.status(201).json({
      customer: sanitizeCustomer(customer),
      requires_verification: requiresVerification,
      // token DONMUYOR — e-posta dogrulanmadan oturum acilamaz
      message: requiresVerification
        ? 'Kayıt alındı. E-postanıza gönderilen doğrulama bağlantısına tıklayın.'
        : 'Kayıt tamamlandı.',
    })
  } catch (error: any) {
    const code = error?.message?.includes('already') || error?.message?.includes('identity') ? 'duplicate_error' : 'unknown_error'
    logger.warn(`[auth] register hatasi: ${error?.message}`)
    res.status(error?.message?.includes('identity') ? 409 : 500).json({
      code,
      message: error?.message?.includes('identity')
        ? 'Bu e-posta ile bir hesap zaten var'
        : error?.message || 'Kayıt başarısız',
    })
  }
}
