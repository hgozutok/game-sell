import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { getAuthSettings } from '../../../../utils/auth-session'
import { getCaptchaSettings } from '../../../../utils/bot-protection'

// GET /store/auth/providers — giris ekraninin sosyal butonlari icin public konfig.
// client_secret ASLA donmez.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const settings = await getAuthSettings(req.scope)
    const captcha = await getCaptchaSettings(req.scope)
    res.json({
      providers: [
        {
          provider: 'google',
          enabled: settings.google.enabled && !!settings.google.clientId,
          client_id: settings.google.clientId || null,
          authorize_url: settings.google.enabled
            ? `${settings.backendUrl}/auth/oauth/google`
            : null,
        },
        {
          provider: 'facebook',
          enabled: settings.facebook.enabled && !!settings.facebook.clientId,
          client_id: settings.facebook.clientId || null,
          authorize_url: settings.facebook.enabled
            ? `${settings.backendUrl}/auth/oauth/facebook`
            : null,
        },
      ],
      email_verification_required: settings.verificationRequired,
      captcha: {
        provider: captcha.provider,
        site_key:
          captcha.provider === 'turnstile'
            ? captcha.turnstileSiteKey || null
            : captcha.provider === 'recaptcha'
              ? captcha.recaptchaSiteKey || null
              : null,
      },
    })
  } catch {
    res.json({ providers: [], email_verification_required: true })
  }
}
