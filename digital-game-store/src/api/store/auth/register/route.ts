import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { createCustomerAccountWorkflow } from '@medusajs/core-flows'
import { getAuthSettings, randomToken, sanitizeCustomer } from '../../../../utils/auth-session'
import { sendTemplateEmail, getAdminEmail } from '../../../../utils/email'
import {
  resolveEmailLocaleFromAcceptLanguage,
  toEmailLocale,
} from '../../../../modules/email-template/locales'
import { clientIp, rateLimit, verifyCaptcha } from '../../../../utils/bot-protection'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any
  try {
    const { email, password, first_name, last_name, phone, captcha_token, locale: bodyLocale } =
      (req.body || {}) as Record<string, string>

    // Kayit e-postasi kullanicinin tarayici dilinde gonderilir; yoksa Ingilizce.
    const requestedLocale =
      toEmailLocale(bodyLocale) ||
      resolveEmailLocaleFromAcceptLanguage(req.headers['accept-language'] as string)

    // Bot korumasi 1) IP rate limit — 15 dk'da 5 kayit
    const rl = rateLimit(`register:${clientIp(req)}`, 5, 15 * 60 * 1000)
    if (!rl.allowed) {
      return res.status(429).json({
        code: 'rate_limited',
        message: `Çok fazla kayıt denemesi. ${Math.ceil(rl.retryAfterSec / 60)} dakika sonra tekrar deneyin.`,
      })
    }

    // Bot korumasi 2) CAPTCHA (admin panelde aciksa) — fail closed
    const captcha = await verifyCaptcha(req.scope, {
      token: captcha_token,
      action: 'register',
      ip: clientIp(req),
    })
    if (!captcha.ok) {
      return res.status(400).json({ code: captcha.reason || 'captcha_failed', message: 'Bot doğrulaması başarısız. Lütfen tekrar deneyin.' })
    }

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
    if ((existing || []).some((c: any) => c.has_account)) {
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

    // 2) customer olustur ve auth identity'ye bagla (actor linki).
    //    Bu adim patlarsa geride kimlik dogrulama kaydi kalmasin; aksi halde
    //    ayni e-posta ile tekrar kayit "identity already exists" hatasi verir.
    let customer: any
    try {
      const { result } = await createCustomerAccountWorkflow(req.scope).run({
        input: {
          authIdentityId: reg.authIdentity.id,
          customerData: {
            email: normalizedEmail,
            first_name: String(first_name).trim().substring(0, 80),
            last_name: String(last_name).trim().substring(0, 80),
            ...(phone ? { phone: String(phone).trim().substring(0, 30) } : {}),
          },
        },
      })
      customer = result
    } catch (createError: any) {
      await authModule
        .deleteAuthIdentities([reg.authIdentity.id])
        .catch((e: any) =>
          logger.warn(`[auth] yarim kayit temizlenemedi: ${e?.message}`)
        )
      throw createError
    }

    // 3) dil tercihi hesaba yazilir — sonraki e-postalar da bu dilde gider
    const currentMetadata =
      customer.metadata && typeof customer.metadata === 'object'
        ? (customer.metadata as Record<string, any>)
        : {}
    const currentPrefs =
      (currentMetadata as any).prefs && typeof (currentMetadata as any).prefs === 'object'
        ? ((currentMetadata as any).prefs as Record<string, any>)
        : {}
    const preferredMetadata = {
      ...currentMetadata,
      prefs: {
        ...currentPrefs,
        locale: requestedLocale,
      },
    }
    customer.metadata = preferredMetadata
    await customerModule
      .updateCustomers(customer.id, { metadata: preferredMetadata })
      .catch((e: any) =>
        logger.warn(`[auth] dil tercihi kaydedilemedi: ${e?.message}`)
      )

    // 4) e-posta dogrulamasi (ayarliysa)
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
      // Baglanti her zaman yapilandirilmis magaza adresini kullanir; istekteki
      // Origin basligina guvenmek phishing linki uretilebilmesine yol acar.
      const verificationUrl = `${settings.frontendUrl}/verify-email?token=${token}`
      const mail = await sendTemplateEmail(req.scope, {
        to: normalizedEmail,
        templateKey: 'verify-email',
        locale: requestedLocale,
        customerId: customer.id,
        acceptLanguage: req.headers['accept-language'] as string,
        data: {
          first_name: String(first_name).trim(),
          verification_url: verificationUrl,
          expires_hours: 24,
        },
        silent: true,
      })
      if (mail.sent) {
        logger.info(`[auth] kayit + dogrulama e-postasi gonderildi: ${normalizedEmail}`)
      } else {
        logger.warn(
          `[auth] dogrulama e-postasi gonderilemedi (${normalizedEmail}): ${mail.error || 'bilinmeyen hata'}`
        )
      }
    }

    // 5) Admine yeni kullanici bildirimi gonder
    try {
      const adminEmail = await getAdminEmail(req.scope)
      if (adminEmail) {
        await sendTemplateEmail(req.scope, {
          to: adminEmail,
          templateKey: 'admin-new-user',
          locale: 'tr',
          data: {
            customer_name: `${String(first_name).trim()} ${String(last_name).trim()}`,
            customer_email: normalizedEmail,
            registration_date: new Date().toLocaleString('tr-TR'),
            verification_status: requiresVerification ? 'Doğrulama Bekliyor' : 'Doğrulandı',
          },
          silent: true,
        })
        logger.info(`[auth] admine yeni uye bildirimi gonderildi -> ${adminEmail}`)
      }
    } catch (adminErr: any) {
      logger.warn(`[auth] admine bildirim e-postasi gonderilemedi: ${adminErr?.message}`)
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
