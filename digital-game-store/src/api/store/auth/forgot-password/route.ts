import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { randomToken, getAuthSettings } from '../../../../utils/auth-session'
import { sendTemplateEmail } from '../../../../utils/email'
import { clientIp, rateLimit, verifyCaptcha } from '../../../../utils/bot-protection'
import { isCustomerDisabled } from '../../../../utils/customer-status'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GENERIC_SUCCESS_MESSAGE = 'Eğer hesabınız mevcutsa şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'

// POST /store/auth/forgot-password — şifre sıfırlama bağlantısı talep etme
// Güvenlik: Her zaman 200 döner (e-posta numaralandırma / enumeration saldırılarını önler)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any

  try {
    const { email, captcha_token } = (req.body || {}) as Record<string, string>
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.trim().length > 254) {
      return res.status(400).json({ code: 'invalid_email', message: 'Geçerli bir e-posta adresi gerekli' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const ip = clientIp(req)

    // Bot & Brute-force koruması: IP bazında 15 dk'da 5 istek, e-posta bazında 15 dk'da 3 istek
    const ipRl = rateLimit(`forgot-pw:ip:${ip}`, 5, 15 * 60 * 1000)
    const emailRl = rateLimit(`forgot-pw:email:${normalizedEmail}`, 3, 15 * 60 * 1000)
    if (!ipRl.allowed || !emailRl.allowed) {
      const wait = Math.max(ipRl.retryAfterSec, emailRl.retryAfterSec)
      return res.status(429).json({
        code: 'rate_limited',
        message: `Çok fazla istek yapıldı. Lütfen ${Math.ceil(wait / 60)} dakika sonra tekrar deneyin.`,
      })
    }

    // CAPTCHA doğrulaması (aktifse)
    const captcha = await verifyCaptcha(req.scope, {
      token: captcha_token,
      action: 'forgot_password',
      ip,
    })
    if (!captcha.ok) {
      return res.status(400).json({
        code: captcha.reason || 'captcha_failed',
        message: 'Bot doğrulaması başarısız. Lütfen tekrar deneyin.',
      })
    }

    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const customers = await customerModule.listCustomers({ email: normalizedEmail })
    const customer = (customers || []).find((c: any) => c.has_account)

    if (customer && !isCustomerDisabled(customer.metadata)) {
      const token = randomToken(32)
      // Şifre sıfırlama tokenı 1 saat geçerli
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()

      await customerModule.updateCustomers(customer.id, {
        metadata: {
          ...(customer.metadata || {}),
          password_reset_token: token,
          password_reset_expires: expires,
        },
      })

      const settings = await getAuthSettings(req.scope)
      const resetUrl = `${settings.frontendUrl}/reset-password?token=${token}`

      await sendTemplateEmail(req.scope, {
        to: normalizedEmail,
        templateKey: 'reset-password',
        customerId: customer.id,
        acceptLanguage: req.headers['accept-language'] as string,
        data: {
          first_name: customer.first_name || '',
          reset_url: resetUrl,
          expires_hours: 1,
        },
        silent: true,
      }).catch((mailErr: any) => {
        logger.warn(`[auth] sifre sifirlama e-postasi gonderilemedi: ${mailErr?.message}`)
      })

      logger.info(`[auth] sifre sifirlama talebi: ${normalizedEmail}`)
    }

    // Her durumda jenerik başarı mesajı (e-posta varlığı sızdırılmaz)
    return res.json({ success: true, message: GENERIC_SUCCESS_MESSAGE })
  } catch (error: any) {
    logger.error(`[auth] forgot-password hatasi: ${error?.message}`)
    return res.json({ success: true, message: GENERIC_SUCCESS_MESSAGE })
  }
}
