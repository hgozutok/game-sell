import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { randomToken, getAuthSettings } from '../../../../utils/auth-session'
import { sendTemplateEmail } from '../../../../utils/email'
import { clientIp, rateLimit } from '../../../../utils/bot-protection'

// Her durumda 200 doner — e-posta enumerasyonuna izin vermez
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any
  const genericMessage =
    'Eğer hesabınız doğrulanmayı bekliyorsa yeni bir bağlantı gönderildi.'
  try {
    const { email } = (req.body || {}) as Record<string, string>
    if (!email) {
      return res.status(400).json({ code: 'missing_email', message: 'Email gerekli' })
    }
    // Bot korumasi: 30 dk'da 3 istek
    const rl = rateLimit(`resend:${clientIp(req)}`, 3, 30 * 60 * 1000)
    if (!rl.allowed) {
      return res.status(429).json({
        message: `Çok fazla istek. ${Math.ceil(rl.retryAfterSec / 60)} dakika sonra tekrar deneyin.`,
      })
    }
    const normalizedEmail = String(email).toLowerCase().trim()

    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const settings = await getAuthSettings(req.scope)
    const customers = await customerModule.listCustomers({ email: normalizedEmail })
    const customer = (customers || []).find((c: any) => c.has_account)

    const eligible =
      customer &&
      customer.has_account &&
      settings.verificationRequired &&
      customer.metadata?.email_verified !== true

    if (eligible) {
      const token = randomToken(32)
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await customerModule.updateCustomers(customer.id, {
        metadata: {
          ...(customer.metadata || {}),
          email_verification_token: token,
          email_verification_expires: expires,
        },
      })
      const verificationUrl = `${settings.frontendUrl}/verify-email?token=${token}`
      const mail = await sendTemplateEmail(req.scope, {
        to: normalizedEmail,
        templateKey: 'verify-email',
        customerId: customer.id,
        acceptLanguage: req.headers['accept-language'] as string,
        data: {
          first_name: customer.first_name || '',
          verification_url: verificationUrl,
          expires_hours: 24,
        },
        silent: true,
      }).catch((e: any) => {
        logger.warn(`[auth] dogrulama e-postasi tekrar gonderilemedi: ${e?.message}`)
        return { sent: false as const }
      })
      if (mail.sent) {
        logger.info(`[auth] dogrulama e-postasi tekrar gonderildi: ${normalizedEmail}`)
      }
    }

    res.json({ message: genericMessage })
  } catch (error: any) {
    res.status(200).json({ message: genericMessage })
  }
}
