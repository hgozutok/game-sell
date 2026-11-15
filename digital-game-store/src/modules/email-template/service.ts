import { MedusaService } from "@medusajs/framework/utils"
import EmailTemplate from "./models/email-template"
import { DEFAULT_EMAIL_TEMPLATES } from "./defaults"
import {
  DEFAULT_EMAIL_LOCALE,
  normalizeEmailLocale,
  type EmailLocale,
} from "./locales"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * {{degisken}} yer tutucularini doldurur.
 * `*_html` ile biten alanlar ham HTML olarak yerlestirilir; digerleri kacislanir.
 */
export function renderEmailString(
  template: string,
  data: Record<string, any> = {},
  options: { escape?: boolean } = {}
): string {
  const escape = options.escape !== false
  return String(template || "").replace(
    /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_match, key: string) => {
      const value = data[key]
      if (value === undefined || value === null) return ""
      const raw = String(value)
      if (key.endsWith("_html")) return raw
      return escape ? escapeHtml(raw) : raw
    }
  )
}

class EmailTemplateService extends MedusaService({ EmailTemplate }) {
  /**
   * Aktif sablonu key + dil ile getirir.
   * Istenen dil yoksa Ingilizce'ye, o da yoksa mevcut herhangi bir dile duser.
   */
  async getTemplate(key: string, locale: string = DEFAULT_EMAIL_LOCALE): Promise<any | null> {
    const normalized = normalizeEmailLocale(locale)

    const exact = await this.listEmailTemplates(
      { key, locale: normalized, active: true },
      { take: 1, order: { created_at: "ASC" } }
    )
    if (exact?.length) return exact[0]

    if (normalized !== DEFAULT_EMAIL_LOCALE) {
      const fallbackEn = await this.listEmailTemplates(
        { key, locale: DEFAULT_EMAIL_LOCALE, active: true },
        { take: 1, order: { created_at: "ASC" } }
      )
      if (fallbackEn?.length) return fallbackEn[0]
    }

    const any = await this.listEmailTemplates(
      { key, active: true },
      { take: 1, order: { created_at: "ASC" } }
    )
    return any?.[0] || null
  }

  /** Eksik varsayilan sablonlari (5 dil) olusturur; mevcutlara dokunmaz. */
  async ensureDefaults(): Promise<{ created: number; existing: number }> {
    let created = 0
    let existing = 0

    for (const def of DEFAULT_EMAIL_TEMPLATES) {
      const current = await this.listEmailTemplates(
        { key: def.key, locale: def.locale },
        { take: 1 }
      )
      if (current?.length) {
        existing++
        continue
      }
      await this.createEmailTemplates(def as any)
      created++
    }

    return { created, existing }
  }

  /** Sablonu verilen veriyle render eder. */
  render(template: { subject?: string; html?: string; text?: string | null }, data: Record<string, any>) {
    return {
      subject: renderEmailString(template.subject || "", data, { escape: false }),
      html: renderEmailString(template.html || "", data, { escape: true }),
      text: template.text
        ? renderEmailString(template.text, data, { escape: false })
        : null,
    }
  }

  /** Desteklenen dilleri ve varsayilan dili dondurur (admin paneli icin). */
  getLocales(): { locales: EmailLocale[]; defaultLocale: EmailLocale } {
    const locales = Array.from(
      new Set(DEFAULT_EMAIL_TEMPLATES.map((template) => template.locale))
    )
    return { locales, defaultLocale: DEFAULT_EMAIL_LOCALE }
  }
}

export default EmailTemplateService
