// Auth session yardimcilari: Medusa-uyumlu JWT uretimi + OAuth/provider ayarlari.
// JWT payload'u auth modulunun bekledigi sekle uyar (actor_id, auth_identity_id),
// boylece /store/* route'larindaki req.auth.actor_id gercek customer ile dolar.
import { ContainerRegistrationKeys, generateJwtToken } from "@medusajs/framework/utils"
import crypto from "crypto"
import { readSmtpSettings } from "./email"

export interface SocialProviderConfig {
  enabled: boolean
  clientId: string
  clientSecret: string
}

export interface AuthSettings {
  verificationRequired: boolean
  frontendUrl: string
  backendUrl: string
  google: SocialProviderConfig
  facebook: SocialProviderConfig
}

function readProvider(map: Record<string, any>, provider: string): SocialProviderConfig {
  const envPrefix = provider.toUpperCase()
  const dbEnabled = map[`auth.${provider}.enabled`]
  const envClientId =
    process.env[`${envPrefix}_CLIENT_ID`] ||
    process.env[`${envPrefix}_OAUTH_CLIENT_ID`] ||
    ""
  const envClientSecret =
    process.env[`${envPrefix}_CLIENT_SECRET`] ||
    process.env[`${envPrefix}_OAUTH_CLIENT_SECRET`] ||
    ""

  const clientId = String(map[`auth.${provider}.client_id`] || envClientId || "")
  const clientSecret = String(map[`auth.${provider}.client_secret`] || envClientSecret || "")

  const enabled =
    dbEnabled !== undefined && dbEnabled !== null && dbEnabled !== ""
      ? dbEnabled === true || dbEnabled === "true"
      : process.env[`${envPrefix}_OAUTH_ENABLED`] === "true" || Boolean(clientId && clientSecret)

  return {
    enabled: Boolean(enabled && clientId && clientSecret),
    clientId,
    clientSecret,
  }
}

export async function getAuthSettings(scope: any): Promise<AuthSettings> {
  const storeSettings = scope.resolve("storeSettings") as any
  const config = scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as any

  const map: Record<string, any> = {}
  try {
    const list = (await storeSettings.listStoreSettings?.({})) || []
    for (const s of list) map[s.key] = s.value
  } catch {
    /* tek tek okuma fallback'i asagida */
  }
  const getVal = async (key: string, def: any = null) => {
    if (key in map) return map[key]
    return await storeSettings.getSettingValue(key, def)
  }

  const frontendUrl =
    String((await getVal("auth.frontend_url", process.env.STORE_URL)) ||
      process.env.STORE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000")
  const backendUrl =
    String(config?.projectConfig?.backendUrl || process.env.MEDUSA_BACKEND_URL || "http://localhost:9000")

  // E-posta dogrulamasi yalnizca SMTP gercekten yapilandirilmissa zorunlu olur.
  // Aksi halde kayit olan kullanici ne dogrulama e-postasi alabilir ne de giris
  // yapabilir; bu da production'da kullaniciyi kilitler.
  //
  // Oncelik: panel ayari > AUTH_EMAIL_VERIFICATION_REQUIRED ortam degiskeni > true.
  // Ortam degiskeni, panel/veritabani ayari yokken (yeni kurulum) dogrulamayi
  // kapatabilmek icin var; Gmail gibi DKIM'siz gecici SMTP'lerde kullanilir.
  const dbVerification = await getVal("auth.email_verification_required", null)
  const requestedVerification =
    dbVerification === null || dbVerification === undefined
      ? String(process.env.AUTH_EMAIL_VERIFICATION_REQUIRED || "true") !== "false"
      : dbVerification !== false && dbVerification !== "false"

  let smtpReady = false
  if (requestedVerification) {
    try {
      const smtp = await readSmtpSettings(scope)
      smtpReady = Boolean(smtp.enabled && smtp.host && smtp.from_email)
    } catch {
      smtpReady = false
    }
    if (!smtpReady) {
      try {
        const logger = scope.resolve("logger") as any
        logger?.warn?.(
          "[auth] e-posta dogrulamasi istendi ancak SMTP yapilandirilmamis — dogrulama devre disi"
        )
      } catch {
        /* logger yoksa sessiz gec */
      }
    }
  }

  return {
    verificationRequired: requestedVerification && smtpReady,
    frontendUrl: frontendUrl.replace(/\/+$/, ""),
    backendUrl: backendUrl.replace(/\/+$/, ""),
    google: readProvider(map, "google"),
    facebook: readProvider(map, "facebook"),
  }
}

export function mintCustomerJwt(
  scope: any,
  params: { customerId: string; authIdentityId: string; expiresIn?: string }
): string {
  const config = scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as any
  const http = config?.projectConfig?.http || {}
  return generateJwtToken(
    {
      actor_id: params.customerId,
      actor_type: "customer",
      auth_identity_id: params.authIdentityId,
      app_metadata: { customer_id: params.customerId },
      user_metadata: {},
    },
    {
      secret: http.jwtSecret || process.env.JWT_SECRET || "supersecret",
      expiresIn: params.expiresIn || http.jwtExpiresIn || "7d",
    }
  )
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex")
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex")
}

/** Kullaniciya temiz customer gorunumu — metadata ASLA donmez (sifre sizmasin) */
export function sanitizeCustomer(customer: any) {
  if (!customer) return null
  return {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
    phone: customer.phone,
    has_account: customer.has_account,
    email_verified: customer.metadata?.email_verified === true,
    created_at: customer.created_at,
  }
}
