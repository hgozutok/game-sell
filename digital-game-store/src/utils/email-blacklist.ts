// E-posta / alan adi kara listesi: kayit ve siparis akislarinda engelleme.
//
// Bot saldirilarinda goruldugu gibi tek kullanici hesabini pasifleştirmek
// yetmez — ayni adresle tekrar kayit olunabilir. Kara liste iki seviyede
// calisir:
//   auth.email_blacklist.emails  -> tam e-posta adresleri (a@b.com)
//   auth.email_blacklist.domains -> alan adlari (mailinator.com — adresin
//                                   @ sonrasi kismi eslesir)
// Kaynak: admin panelindeki Kullanicilar sayfasi (/admin/email-blacklist).
// Uygulama noktalari: /store/auth/register, /store/auth/login,
// /store/orders/create ve order-guard (sepet tamamlama).
import type { GuardResult } from "./order-guard"

const EMAILS_KEY = "auth.email_blacklist.emails"
const DOMAINS_KEY = "auth.email_blacklist.domains"

export interface EmailBlacklist {
  emails: string[]
  domains: string[]
}

export interface BlacklistCheckResult {
  blocked: boolean
  /** 'email' = tam adres eslesti, 'domain' = alan adi eslesti */
  kind?: "email" | "domain"
  /** eslesen kara liste kaydi */
  match?: string
}

function normalizeEmail(email: unknown): string {
  return String(email || "").trim().toLowerCase()
}

function normalizeDomain(domain: unknown): string {
  return String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean)
  }
  // eski/tekil deger — string olarak saklanmissa
  if (typeof value === "string" && value.trim()) return [value.trim()]
  return []
}

export async function getEmailBlacklist(scope: any): Promise<EmailBlacklist> {
  const storeSettings = scope.resolve("storeSettings") as any
  const [emails, domains] = await Promise.all([
    storeSettings.getSettingValue(EMAILS_KEY, []).catch(() => []),
    storeSettings.getSettingValue(DOMAINS_KEY, []).catch(() => []),
  ])
  return {
    emails: toList(emails),
    domains: toList(domains),
  }
}

/** E-postayi kara listeye gore kontrol eder (tam adres + alan adi). */
export async function checkEmailBlacklist(
  scope: any,
  email: unknown
): Promise<BlacklistCheckResult> {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes("@")) {
    return { blocked: false }
  }

  const blacklist = await getEmailBlacklist(scope)
  const emailSet = new Set(blacklist.emails.map(normalizeEmail))
  if (emailSet.has(normalized)) {
    return { blocked: true, kind: "email", match: normalized }
  }

  const domain = normalized.split("@")[1] || ""
  if (domain && blacklist.domains.map(normalizeDomain).includes(domain)) {
    return { blocked: true, kind: "domain", match: domain }
  }

  return { blocked: false }
}

/** order-guard uyumlu sarmalayici: engelliyse 403 GuardResult doner. */
export async function verifyEmailNotBlacklisted(
  scope: any,
  email: unknown
): Promise<GuardResult> {
  const check = await checkEmailBlacklist(scope, email)
  if (check.blocked) {
    return {
      ok: false,
      status: 403,
      code: "email_blocked",
      message:
        check.kind === "domain"
          ? `Bu e-posta sağlayıcısı (${check.match}) mağazada engellenmiştir`
          : "Bu e-posta adresi mağazada engellenmiştir",
    }
  }
  return { ok: true }
}

async function saveList(
  scope: any,
  key: string,
  list: string[]
): Promise<void> {
  const storeSettings = scope.resolve("storeSettings") as any
  await storeSettings.setSetting(key, list, {
    category: "auth",
    description: "e-posta kara listesi (admin)",
  })
}

/** Kara listeye tam e-posta adresi ekler (idempotent). */
export async function addEmailToBlacklist(scope: any, email: string): Promise<void> {
  const normalized = normalizeEmail(email)
  if (!normalized.includes("@")) {
    throw new Error("Geçersiz e-posta adresi")
  }
  const blacklist = await getEmailBlacklist(scope)
  if (blacklist.emails.map(normalizeEmail).includes(normalized)) return
  await saveList(scope, EMAILS_KEY, [...blacklist.emails, normalized])
}

/** Kara listeye alan adi ekler (idempotent). */
export async function addDomainToBlacklist(scope: any, domain: string): Promise<void> {
  const normalized = normalizeDomain(domain)
  if (!normalized || !normalized.includes(".")) {
    throw new Error("Geçersiz alan adı")
  }
  const blacklist = await getEmailBlacklist(scope)
  if (blacklist.domains.map(normalizeDomain).includes(normalized)) return
  await saveList(scope, DOMAINS_KEY, [...blacklist.domains, normalized])
}

export async function removeEmailFromBlacklist(scope: any, email: string): Promise<void> {
  const normalized = normalizeEmail(email)
  const blacklist = await getEmailBlacklist(scope)
  await saveList(
    scope,
    EMAILS_KEY,
    blacklist.emails.filter((e) => normalizeEmail(e) !== normalized)
  )
}

export async function removeDomainFromBlacklist(scope: any, domain: string): Promise<void> {
  const normalized = normalizeDomain(domain)
  const blacklist = await getEmailBlacklist(scope)
  await saveList(
    scope,
    DOMAINS_KEY,
    blacklist.domains.filter((d) => normalizeDomain(d) !== normalized)
  )
}

/** Bir e-postanin @ sonrasi alan adi (kontrol/arayuz icin). */
export function emailDomain(email: unknown): string {
  const normalized = normalizeEmail(email)
  return normalized.split("@")[1] || ""
}
