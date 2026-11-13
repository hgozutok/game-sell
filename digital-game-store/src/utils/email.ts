import nodemailer from "nodemailer"
import { decryptText, encryptText } from "./key-crypto"

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
  const get = async (key: string, fallback: any = "") =>
    storeSettings.getSettingValue(key, fallback)

  const [enabled, host, port, secure, user, passwordRaw, fromEmail, fromName] =
    await Promise.all([
      get(SMTP_SETTING_KEYS.enabled, false),
      get(SMTP_SETTING_KEYS.host, ""),
      get(SMTP_SETTING_KEYS.port, 587),
      get(SMTP_SETTING_KEYS.secure, false),
      get(SMTP_SETTING_KEYS.user, ""),
      get(SMTP_SETTING_KEYS.password, ""),
      get(SMTP_SETTING_KEYS.fromEmail, ""),
      get(SMTP_SETTING_KEYS.fromName, ""),
    ])

  return {
    enabled: enabled === true || enabled === "true",
    host: String(host || "").trim(),
    port: Number(port) || 587,
    secure: secure === true || secure === "true",
    user: String(user || "").trim(),
    password: parseStoredPassword(passwordRaw),
    from_email: String(fromEmail || "").trim(),
    from_name: String(fromName || "").trim(),
  }
}

export interface SendTemplateEmailOptions {
  to: string
  templateKey: string
  data?: Record<string, any>
  subject?: string
  replyTo?: string
  /** Sablon dili (tr/en). Verilmezse admin panelindeki varsayilan dil kullanilir. */
  locale?: string
  /** SMTP kapaliyken hata yerine sessizce atla (workflow'larda tercih edilir) */
  silent?: boolean
}

export interface SendTemplateEmailResult {
  sent: boolean
  skipped?: boolean
  messageId?: string
  error?: string
}

/** Sablonu DB'den alir, {{degisken}}leri doldurur ve SMTP ile gonderir. */
export async function sendTemplateEmail(
  container: any,
  options: SendTemplateEmailOptions
): Promise<SendTemplateEmailResult> {
  const logger = container.resolve("logger") as any

  try {
    const smtp = await readSmtpSettings(container)
    if (!smtp.enabled || !smtp.host || !smtp.from_email) {
      logger?.warn?.(
        `[email] SMTP yapilandirilmamis — "${options.templateKey}" gonderilmedi (to=${options.to})`
      )
      return { sent: false, skipped: true, error: "SMTP yapılandırılmamış" }
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
    const locale =
      options.locale ||
      (await storeSettings.getSettingValue("email.language", "tr")) ||
      "tr"
    let template = await emailTemplate.getTemplate(options.templateKey, String(locale))
    if (!template) {
      await emailTemplate.ensureDefaults()
      template = await emailTemplate.getTemplate(options.templateKey, String(locale))
    }

    if (!template) {
      return { sent: false, error: `Şablon bulunamadı: ${options.templateKey}` }
    }

    const renderData: Record<string, any> = {
      store_name: storeName,
      support_email: supportEmail,
      site_url: siteUrl,
      year: new Date().getFullYear(),
      now: new Date().toLocaleString("tr-TR"),
      customer_name: "Değerli Müşteri",
      ...(options.data || {}),
    }

    const rendered = emailTemplate.render(template, renderData)
    const subject = options.subject || rendered.subject || "Bilgilendirme"

    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
      },
    })

    const fromName = smtp.from_name || storeName
    const info = await transport.sendMail({
      from: `"${fromName}" <${smtp.from_email}>`,
      to: options.to,
      subject,
      html: rendered.html,
      text: rendered.text || undefined,
      replyTo: options.replyTo,
    })

    logger?.info?.(`[email] "${options.templateKey}" gonderildi -> ${options.to}`)
    return { sent: true, messageId: info.messageId }
  } catch (error: any) {
    logger?.warn?.(`[email] gonderim hatasi (${options.templateKey}): ${error?.message}`)
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
