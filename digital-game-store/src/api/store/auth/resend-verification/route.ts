import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { randomToken, getAuthSettings } from '../../../../utils/auth-session'
import { sendTemplateEmail } from '../../../../utils/email'

// Her durumda 200 doner — e-posta enumerasyonuna izin vermez
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any
  try {
    const { email } = (req.body || {}) as Record<string, string>
    if (!email) {
      return res.status(400).json({ code: 'missing_email', message: 'Email gerekli' })
    }
    const normalizedEmail = String(email).toLowerCase().trim()

    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const settings = await getAuthSettings(req.scope)
    const customers = await customerModule.listCustomers({ email: normalizedEmail })
    const customer = customers?.[0]

    const eligible =
      customer &&
      customer.has_account &&
      customer.metadata?.email_verified === false

    if (eligible && settings.verificationRequired) {
      const token = randomToken(32)
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      await customerModule.updateCustomers(customer.id, {
        metadata: {
          ...(customer.metadata || {}),
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
          first_name: customer.first_name || '',
          verification_url: verificationUrl,
          expires_hours: 24,
        },
        silent: true,
      }).catch((e: any) => logger.warn(`[auth] dogrulama e-postasi tekrar gonderilemedi: ${e?.message}`))
    }

    res.json({ message: 'Eğer hesabınız doğrulanmayı bekliyorsa yeni bir bağlantı gönderildi.' })
  } catch (error: any) {
    res.status(200).json({ message: 'Eğer hesabınız doğrulanmayı bekliyorsa yeni bir bağlantı gönderildi.' })
  }
}
