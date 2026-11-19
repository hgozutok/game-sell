import nodemailer from "nodemailer"
import { Modules } from "@medusajs/framework/utils"
import { decryptText, encryptText } from "./key-crypto"
import {
  DEFAULT_EMAIL_LOCALE,
  EMAIL_LOCALE_META,
  normalizeEmailLocale,
  resolveEmailLocaleFromAcceptLanguage,
  toEmailLocale,
  type EmailLocale,
} from "../modules/email-template/locales"

/**
 * SMTP ayarlari `store_setting` tablosunda `email.smtp.*` anahtarlariyla tutulur.
 * Sifre AES-256-GCM ile sifrelenir (key-crypto).
 */

export const SMTP_SETTING_KEYS = {
  enabled: "email.smtp.enabled",
  host: "email.smtp.host",
  port: "email.smtp.port",
  secure: "email.smtp.secure",
  user: "email.smtp.user",
  password: "email.smtp.password",
  fromEmail: "email.smtp.from_email",
  fromName: "email.smtp.from_name",
} as const

/**
 * SMTP ayarlari once `store_setting` tablosundan, orada bos olan alanlar
 * ortam degiskenlerinden okunur. Boylece VPS'te `.env` ile yapilandirma
 * yapilabilir; panelden kaydedilen deger her zaman ortam degerini ezer.
 */
function envBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback
  return value === "true" || value === "1"
}

function envString(value: string | undefined): string {
  return String(value || "").trim()
}

/**
 * "Hupi eSIM <info@hupiplay.uk>" veya "info@hupiplay.uk" bicimindeki
 * degeri e-posta + gorunen ada ayirir. Saglayicilarin cogu (ve Gmail)
 * From basligini bu bicimde bekler.
 */
export function parseFromHeader(value: string | undefined): {
  email: string
  name: string
} {
  const raw = envString(value).replace(/^["']|["']$/g, "").trim()
  if (!raw) return { email: "", name: "" }

  const bracketed = raw.match(/^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>$/)
  if (bracketed) {
    return {
      name: bracketed[1].trim().replace(/^["']|["']$/g, "").trim(),
      email: bracketed[2].trim(),
    }
  }

  const plain = raw.match(/[^<>\s,;]+@[^<>\s,;]+/)
  return { email: plain ? plain[0] : "", name: "" }
}

export interface SmtpSettingsSource {
  enabled: "db" | "env" | "default"
  host: "db" | "env" | "none"
}

export interface SmtpSettings {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  from_email: string
  from_name: string
}

function tryDecrypt(value: any): string | null {
  if (value && typeof value === "object" && value.iv && value.tag && value.data) {
    try {
      return decryptText(value)
    } catch {
      return null
    }
  }
  return null
}

function parseStoredPassword(value: any): string {
  if (!value) return ""
  if (typeof value === "object") {
    return tryDecrypt(value) ?? ""
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      return tryDecrypt(parsed) ?? ""
    } catch {
      // Sifrelenmemis eski kayit — oldugu gibi kullan
      return value
    }
  }
  return ""
}

export function encodePassword(password: string): string {
  return JSON.stringify(encryptText(password))
}

export async function readSmtpSettings(container: any): Promise<SmtpSettings> {
  const storeSettings = container.resolve("storeSettings") as any
  // null = ayar DB'de hic yok (ortam degiskenine dus); "" = bilerek bos.
  const get = async (key: string): Promise<any> => {
    try {
      const setting = await storeSettings.getSetting(key)
      return setting ? setting.value : null
    } catch {
      return null
    }
  }

  const [enabledDb, hostDb, portDb, secureDb, userDb, passwordRaw, fromEmailDb, fromNameDb] =
    await Promise.all([
      get(SMTP_SETTING_KEYS.enabled),
      get(SMTP_SETTING_KEYS.host),
      get(SMTP_SETTING_KEYS.port),
      get(SMTP_SETTING_KEYS.secure),
      get(SMTP_SETTING_KEYS.user),
      get(SMTP_SETTING_KEYS.password),
      get(SMTP_SETTING_KEYS.fromEmail),
      get(SMTP_SETTING_KEYS.fromName),
    ])

  const dbString = (value: any): string =>
    value === null || value === undefined ? "" : String(value).trim()

  const envEnabled = envBool(process.env.SMTP_ENABLED, false)
  const enabled =
    enabledDb === null || enabledDb === undefined
      ? envEnabled
      : enabledDb === true || enabledDb === "true"

  const envPort = Number(process.env.SMTP_PORT || 0)
  const port =
    Number(portDb) ||
    (Number.isFinite(envPort) && envPort > 0 ? envPort : 587)

  const secure =
    secureDb === null || secureDb === undefined
      ? envBool(process.env.SMTP_SECURE, port === 465)
      : secureDb === true || secureDb === "true"

  const user = dbString(userDb) || envString(process.env.SMTP_USER)
  // SMTP_FROM="Ad <adres>" bicimini de kabul et; ayri alanlar onceliklidir.
  const envFrom = parseFromHeader(process.env.SMTP_FROM)
  const fromEmail =
    dbString(fromEmailDb) ||
    envString(process.env.SMTP_FROM_EMAIL) ||
    envFrom.email
  const fromName =
    dbString(fromNameDb) ||
    envString(process.env.SMTP_FROM_NAME) ||
    envFrom.name

  return {
    enabled,
    host: dbString(hostDb) || envString(process.env.SMTP_HOST),
    port,
    secure,
    user,
    // SMTP_PASS: saglayicilarin (ve Gmail'in) dokumantasyonunda yaygin ad.
    password:
      parseStoredPassword(passwordRaw) ||
      envString(process.env.SMTP_PASSWORD) ||
      envString(process.env.SMTP_PASS),
    from_email: fromEmail,
    from_name: fromName,
  }
}

/** Admin bildirimlerinin gonderilecegi e-posta adresini cozer. */
export async function getAdminEmail(container: any): Promise<string> {
  try {
    const storeSettings = container.resolve("storeSettings") as any
    const adminEmail =
      (await storeSettings.getSettingValue("store.admin_email", "")) ||
      process.env.ADMIN_EMAIL ||
      (await storeSettings.getSettingValue("store.support_email", "")) ||
      process.env.SMTP_FROM_EMAIL ||
      "info@hupiplay.uk"
    return String(adminEmail).trim()
  } catch {
    return process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || "info@hupiplay.uk"
  }
}

/** Sablonlarda ve tablo basliklarinda kullanilan dile ozel metinler. */
export interface EmailUiText {
  /** Dil tespit edilemediginde kullanilan hitap. */
  customer: string
  product: string
  key: string
  quantity: string
  total: string
  order: string
  notificationSubject: string
}

export const EMAIL_UI_TEXT: Record<EmailLocale, EmailUiText> = {
  en: {
    customer: "Valued Customer",
    product: "Product",
    key: "Key",
    quantity: "Qty",
    total: "Total",
    order: "Order",
    notificationSubject: "Notification",
  },
  tr: {
    customer: "Değerli Müşteri",
    product: "Ürün",
    key: "Anahtar",
    quantity: "Adet",
    total: "Tutar",
    order: "Sipariş",
    notificationSubject: "Bilgilendirme",
  },
  de: {
    customer: "Geschätzter Kunde",
    product: "Produkt",
    key: "Schlüssel",
    quantity: "Menge",
    total: "Gesamt",
    order: "Bestellung",
    notificationSubject: "Benachrichtigung",
  },
  fr: {
    customer: "Cher client",
    product: "Produit",
    key: "Clé",
    quantity: "Quantité",
    total: "Total",
    order: "Commande",
    notificationSubject: "Notification",
  },
  ar: {
    customer: "عزيزي العميل",
    product: "المنتج",
    key: "المفتاح",
    quantity: "الكمية",
    total: "الإجمالي",
    order: "الطلب",
    notificationSubject: "إشعار",
  },
}

export function emailUiText(locale?: string | null): EmailUiText {
  return EMAIL_UI_TEXT[normalizeEmailLocale(locale)]
}

/** Secilen dilde tarih/saat metni (ornek: "14 Kas 2026 12:30"). */
export function formatEmailDateTime(
  locale?: string | null,
  value: Date | string | number = new Date()
): string {
  const normalized = normalizeEmailLocale(locale)
  const date = value instanceof Date ? value : new Date(value)
  try {
    return new Intl.DateTimeFormat(EMAIL_LOCALE_META[normalized].intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

export interface EmailLocaleContext {
  /** Acikca verilen dil (istek dili, siparis metadata'si vb.). */
  locale?: string | null
  /** Template verisi icinde tasinan dil. */
  dataLocale?: string | null
  /** Alicinin musteri kaydi; metadata.prefs.locale okunur. */
  customerId?: string | null
  /** Musteri kaydi yoksa e-posta ile tercih aranir. */
  email?: string | null
  /** Accept-Language basligi (tarayici dili). */
  acceptLanguage?: string | null
}

/**
 * Alicinin e-posta dilini cozer.
 * Sirasi: acik dil -> musteri tercihi -> Accept-Language -> Ingilizce.
 */
export async function resolveEmailLocale(
  container: any,
  context: EmailLocaleContext = {}
): Promise<EmailLocale> {
  const explicit =
    toEmailLocale(context.locale) || toEmailLocale(context.dataLocale)
  if (explicit) return explicit

  try {
    const customerModule = container.resolve(Modules.CUSTOMER) as any
    let customer: any = null

    if (context.customerId) {
      customer = await customerModule
        .retrieveCustomer(context.customerId)
        .catch(() => null)
    }

    if (!customer && context.email) {
      const customers = await customerModule
        .listCustomers({ email: String(context.email).toLowerCase().trim() })
        .catch(() => [])
      customer = customers?.[0] || null
    }

    const saved = toEmailLocale(
      customer?.metadata?.prefs?.locale ||
        customer?.metadata?.locale ||
        customer?.metadata?.language ||
        customer?.metadata?.preferred_locale
    )
    if (saved) return saved
  } catch {
    /* musteri modulu yoksa / kayit bulunamazsa tarayici diline gec */
  }

  return resolveEmailLocaleFromAcceptLanguage(context.acceptLanguage)
}

export interface SendTemplateEmailOptions {
  to: string
  templateKey: string
  data?: Record<string, any>
  subject?: string
  replyTo?: string
  /**
   * Sablon dili (en/tr/de/fr/ar).
   * Verilmezse alicinin hesap tercihi, sonra Accept-Language,
   * hicbiri yoksa Ingilizce kullanilir.
   */
  locale?: string
  /** Alicinin musteri kaydi — kayitli dil tercihi icin. */
  customerId?: string | null
  /** Tarayici dili; musteri tercihi yoksa kullanilir. */
  acceptLanguage?: string | null
  /** SMTP kapaliyken hata yerine sessizce atla (workflow'larda tercih edilir) */
  silent?: boolean
}

export interface SendTemplateEmailResult {
  sent: boolean
  skipped?: boolean
  messageId?: string
  locale?: EmailLocale
  error?: string
}

/** Sablonu DB'den alir, {{degisken}}leri doldurur ve SMTP ile gonderir. */
export async function sendTemplateEmail(
  container: any,
  options: SendTemplateEmailOptions
): Promise<SendTemplateEmailResult> {
  const logger = container.resolve("logger") as any

  try {
    const locale = await resolveEmailLocale(container, {
      locale: options.locale,
      dataLocale:
        options.data?.locale ||
        options.data?.language ||
        options.data?.prefs?.locale,
      customerId: options.customerId,
      email: options.to,
      acceptLanguage: options.acceptLanguage,
    })

    const smtp = await readSmtpSettings(container)
    if (!smtp.enabled || !smtp.host || !smtp.from_email) {
      logger?.warn?.(
        `[email] SMTP yapilandirilmamis — "${options.templateKey}" (${locale}) gonderilmedi (to=${options.to})`
      )
      return { sent: false, skipped: true, locale, error: "SMTP yapılandırılmamış" }
    }

    const storeSettings = container.resolve("storeSettings") as any
    const storeName = await storeSettings.getSettingValue("store.name", "Mağaza")
    const supportEmail = await storeSettings.getSettingValue(
      "store.support_email",
      smtp.from_email
    )
    const siteUrl =
      process.env.STORE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"

    const emailTemplate = container.resolve("emailTemplate") as any
    let template = await emailTemplate.getTemplate(options.templateKey, locale)
    if (!template) {
      await emailTemplate.ensureDefaults()
      template = await emailTemplate.getTemplate(options.templateKey, locale)
    }

    if (!template) {
      return {
        sent: false,
        locale,
        error: `Şablon bulunamadı: ${options.templateKey} (${locale})`,
      }
    }

    const renderData: Record<string, any> = {
      store_name: storeName,
      support_email: supportEmail,
      site_url: siteUrl,
      year: new Date().getFullYear(),
      now: formatEmailDateTime(locale),
      customer_name: emailUiText(locale).customer,
      ...(options.data || {}),
      locale,
    }

    const rendered = emailTemplate.render(template, renderData)
    const subject =
      options.subject ||
      rendered.subject ||
      emailUiText(locale).notificationSubject

    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
      },
    })

    // Baslik enjeksiyonunu engelle: ad alaninda tirnak/satir sonu olamaz.
    const fromName = String(smtp.from_name || storeName)
      .replace(/[\r\n"<>]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 120)
    const info = await transport.sendMail({
      from: `"${fromName}" <${smtp.from_email}>`,
      to: options.to,
      subject,
      html: rendered.html,
      text: rendered.text || undefined,
      replyTo: options.replyTo || supportEmail || undefined,
    })

    logger?.info?.(
      `[email] "${options.templateKey}" (${locale}) gonderildi -> ${options.to}`
    )
    return { sent: true, messageId: info.messageId, locale }
  } catch (error: any) {
    logger?.warn?.(
      `[email] gonderim hatasi (${options.templateKey}, locale=${options.locale || DEFAULT_EMAIL_LOCALE}): ${error?.message}`
    )
    return { sent: false, error: String(error?.message || error) }
  }
}

/** Tablo satirlarindan basit HTML tablo uretir (sablonlarda {{keys_html}} / {{items_html}}). */
export function buildTableHtml(
  rows: Array<Record<string, any>>,
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>
): string {
  if (!rows?.length) return ""
  const head = columns
    .map(
      (c) =>
        `<th style="padding:10px 12px;text-align:${c.align || "left"};font-size:12px;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;border-bottom:1px solid #e6e8ee;">${c.label}</th>`
    )
    .join("")
  const body = rows
    .map((row) => {
      const cells = columns
        .map(
          (c) =>
            `<td style="padding:12px;text-align:${c.align || "left"};font-size:14px;color:#111827;border-bottom:1px solid #f0f1f5;">${row[c.key] ?? ""}</td>`
        )
        .join("")
      return `<tr>${cells}</tr>`
    })
    .join("")

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e8ee;border-radius:8px;border-collapse:separate;overflow:hidden;margin:8px 0 16px;">
    <thead style="background:#f8f9fb;"><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>`
}

export function escapeHtmlValue(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
