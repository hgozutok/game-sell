import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { getAuthSettings, randomToken } from '../../../../utils/auth-session'

// GET /auth/oauth/:provider — saglayicinin onay ekranina yonlendirir.
// CSRF korumasi: rastgele state httpOnly cookie'ye yazilir, callback'te karsilastirilir.
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const FACEBOOK_AUTH = 'https://www.facebook.com/v19.0/dialog/oauth'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { provider } = req.params as { provider: string }

  try {
    const settings = await getAuthSettings(req.scope)
    const p = provider === 'google' ? settings.google : provider === 'facebook' ? settings.facebook : null

    const fail = (reason: string) => {
      res.redirect(302, `${settings.frontendUrl}/login?social=error&reason=${encodeURIComponent(reason)}`)
    }

    if (!p || !p.enabled || !p.clientId || !p.clientSecret) {
      return fail('provider_disabled')
    }

    const state = randomToken(16)
    const redirectUri = `${settings.backendUrl}/auth/oauth/${provider}/callback`

    const isSecure =
      process.env.COOKIE_SECURE !== 'false' &&
      (process.env.NODE_ENV === 'production' || settings.backendUrl.startsWith('https'))
    const secureFlag = isSecure ? '; Secure' : ''

    res.setHeader(
      'Set-Cookie',
      `oauth_state_${provider}=${state}; HttpOnly; Path=/auth/oauth/${provider}/callback; Max-Age=600; SameSite=Lax${secureFlag}`
    )

    if (provider === 'google') {
      const url = new URL(GOOGLE_AUTH)
      url.searchParams.set('client_id', p.clientId)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'openid email profile')
      url.searchParams.set('state', state)
      url.searchParams.set('prompt', 'select_account')
      return res.redirect(302, url.toString())
    }

    if (provider === 'facebook') {
      const url = new URL(FACEBOOK_AUTH)
      url.searchParams.set('client_id', p.clientId)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'email,public_profile')
      url.searchParams.set('state', state)
      return res.redirect(302, url.toString())
    }

    return fail('unknown_provider')
  } catch (e: any) {
    return res.redirect(302, `http://localhost:3000/login?social=error&reason=server`)
  }
}

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  res.status(204).end()
}
