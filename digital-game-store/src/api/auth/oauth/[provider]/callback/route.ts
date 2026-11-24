import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { getAuthSettings, mintCustomerJwt } from '../../../../../utils/auth-session'
import { getAdminEmail, sendTemplateEmail } from '../../../../../utils/email'

const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo'
const FACEBOOK_TOKEN = 'https://graph.facebook.com/v19.0/oauth/access_token'
const FACEBOOK_ME = 'https://graph.facebook.com/me'

interface OAuthProfile {
  providerUserId: string
  email: string
  firstName: string
  lastName: string
}

async function exchangeGoogle(code: string, cfg: any, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`google token: ${res.status}`)
  const { access_token } = await res.json()
  const info = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!info.ok) throw new Error(`google userinfo: ${info.status}`)
  const u = await info.json()
  return {
    providerUserId: String(u.sub),
    email: String(u.email || '').toLowerCase(),
    firstName: String(u.given_name || u.name || '').split(' ')[0] || 'User',
    lastName: String(u.family_name || u.name || '').split(' ').slice(1).join(' ') || '-',
  } as OAuthProfile
}

async function exchangeFacebook(code: string, cfg: any, redirectUri: string) {
  const url = new URL(FACEBOOK_TOKEN)
  url.searchParams.set('code', code)
  url.searchParams.set('client_id', cfg.clientId)
  url.searchParams.set('client_secret', cfg.clientSecret)
  url.searchParams.set('redirect_uri', redirectUri)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`facebook token: ${res.status}`)
  const { access_token } = await res.json()
  const me = new URL(FACEBOOK_ME)
  me.searchParams.set('fields', 'id,name,email')
  me.searchParams.set('access_token', access_token)
  const info = await fetch(me.toString())
  if (!info.ok) throw new Error(`facebook me: ${info.status}`)
  const u = await info.json()
  const nameParts = String(u.name || 'User').split(' ')
  return {
    providerUserId: String(u.id),
    email: String(u.email || '').toLowerCase(),
    firstName: nameParts[0] || 'User',
    lastName: nameParts.slice(1).join(' ') || '-',
  } as OAuthProfile
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any
  const { provider } = req.params as { provider: string }
  const query = (req.query || {}) as Record<string, string>
  const fail = (frontend: string, reason: string) =>
    res.redirect(302, `${frontend}/login?social=error&reason=${encodeURIComponent(reason)}`)

  try {
    if (provider !== 'google' && provider !== 'facebook') {
      return fail('http://localhost:3000', 'unknown_provider')
    }
    const settings = await getAuthSettings(req.scope)
    const cfg = provider === 'google' ? settings.google : settings.facebook

    if (query.error) {
      return fail(settings.frontendUrl, String(query.error))
    }
    const code = query.code
    const state = query.state
    const cookieHeader = req.headers.cookie || ''
    const expectedState = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`oauth_state_${provider}=`))
      ?.split('=')[1]

    if (!code || !state || !expectedState || state !== expectedState) {
      return fail(settings.frontendUrl, 'state_mismatch')
    }

    const redirectUri = `${settings.backendUrl}/auth/oauth/${provider}/callback`
    const profile =
      provider === 'google'
        ? await exchangeGoogle(code, cfg, redirectUri)
        : await exchangeFacebook(code, cfg, redirectUri)

    const profileEmail = String(profile.email || '').trim().toLowerCase()
    if (!profileEmail) {
      return fail(settings.frontendUrl, 'no_email')
    }

    // musteri bul veya yarat — saglayici e-postasi dogrulanmis kabul edilir
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const authModule = req.scope.resolve(Modules.AUTH) as any
    const existing = await customerModule.listCustomers({ email: profileEmail })
    let customer = existing?.[0]
    if (!customer) {
      customer = await customerModule.createCustomers({
        email: profileEmail,
        first_name: profile.firstName.substring(0, 80),
        last_name: profile.lastName.substring(0, 80),
        has_account: true,
        metadata: { email_verified: true, email_verified_at: new Date().toISOString(), social_provider: provider },
      })
      logger.info(`[oauth] yeni musteri: ${profileEmail} (${provider})`)

      try {
        const adminEmail = await getAdminEmail(req.scope)
        if (adminEmail) {
          await sendTemplateEmail(req.scope, {
            to: adminEmail,
            templateKey: 'admin-new-user',
            locale: 'tr',
            data: {
              customer_name: `${profile.firstName} ${profile.lastName}`,
              customer_email: profileEmail,
              registration_date: new Date().toLocaleString('tr-TR'),
              verification_status: `Doğrulandı (${provider})`,
            },
            silent: true,
          })
        }
      } catch (err: any) {
        logger.warn(`[oauth] admin bildirim hatasi: ${err?.message}`)
      }
    } else if (customer.metadata?.email_verified !== true) {
      await customerModule.updateCustomers(customer.id, {
        metadata: { ...(customer.metadata || {}), email_verified: true, social_provider: provider },
      })
    }

    // auth identity: provider_identities uzerinden bul veya yarat; actor bagini garanti et
    let identityId: string | null = null
    try {
      const identities = await authModule.listAuthIdentities(
        {},
        { relations: ['provider_identities'], take: 1000 }
      )
      const own = (identities || []).find((i: any) =>
        (i.provider_identities || []).some(
          (pi: any) => pi.provider === provider && pi.entity_id === profile.providerUserId
        )
      )
      identityId = own?.id || null
    } catch {
      identityId = null
    }
    if (!identityId) {
      const created = await authModule.createAuthIdentities({
        provider,
        entity_id: profile.providerUserId,
        app_metadata: { customer_id: customer.id },
        user_metadata: { email: profile.email },
      })
      identityId = created.id
    } else {
      await authModule
        .updateAuthIdentities({ id: identityId, app_metadata: { customer_id: customer.id } })
        .catch(() => null)
    }

    const token = mintCustomerJwt(req.scope, {
      customerId: customer.id,
      authIdentityId: identityId,
    })

    // cookie olarak da set edilir (Authorization kullanan istemciler icin token param'la doner)
    const isSecure =
      process.env.COOKIE_SECURE !== 'false' &&
      (process.env.NODE_ENV === 'production' || settings.frontendUrl.startsWith('https'))
    const secureFlag = isSecure ? '; Secure' : ''

    res.setHeader(
      'Set-Cookie',
      `_medusa_jwt=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secureFlag}`
    )
    logger.info(`[oauth] oturum acildi: ${profile.email} (${provider})`)
    res.redirect(302, `${settings.frontendUrl}/auth/callback?token=${token}&provider=${provider}`)
  } catch (e: any) {
    logger.warn(`[oauth] ${provider} callback hatasi: ${e?.message}`)
    const settings = await getAuthSettings(req.scope).catch(() => null)
    const frontend = settings?.frontendUrl || 'http://localhost:3000'
    return fail(frontend, 'server')
  }
}
