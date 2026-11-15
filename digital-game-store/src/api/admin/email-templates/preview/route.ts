import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { renderEmailString } from "../../../../modules/email-template/service"
import {
  DEFAULT_EMAIL_LOCALE,
  EMAIL_LOCALE_META,
  normalizeEmailLocale,
  type EmailLocale,
} from "../../../../modules/email-template/locales"
import {
  buildTableHtml,
  emailUiText,
  escapeHtmlValue,
  formatEmailDateTime,
} from "../../../../utils/email"

export const AUTHENTICATE = false

const SAMPLE_NAMES: Record<EmailLocale, string> = {
  en: "John Smith",
  tr: "Ahmet Yılmaz",
  de: "Max Mustermann",
  fr: "Jean Dupont",
  ar: "أحمد الفارسي",
}

const SAMPLE_MESSAGES: Record<EmailLocale, string> = {
  en: "Hello, I would like to get information about my order.",
  tr: "Merhaba, siparişim hakkında bilgi almak istiyorum.",
  de: "Hallo, ich hätte gerne Informationen zu meiner Bestellung.",
  fr: "Bonjour, je souhaiterais obtenir des informations sur ma commande.",
  ar: "مرحبًا، أود الحصول على معلومات حول طلبي.",
}

const SAMPLE_TITLES: Record<EmailLocale, [string, string]> = {
  en: ["Sample Game — Steam CD Key", "Sample Game 2 — Epic Key"],
  tr: ["Örnek Oyun — Steam CD Key", "Örnek Oyun 2 — Epic Key"],
  de: ["Beispielspiel — Steam CD Key", "Beispielspiel 2 — Epic Key"],
  fr: ["Jeu d’exemple — Steam CD Key", "Jeu d’exemple 2 — Epic Key"],
  ar: ["لعبة تجريبية — Steam CD Key", "لعبة تجريبية 2 — Epic Key"],
}

const SAMPLE_CURRENCY: Record<EmailLocale, string> = {
  en: "USD",
  tr: "TRY",
  de: "EUR",
  fr: "EUR",
  ar: "USD",
}

function formatMoney(value: number, locale: EmailLocale): string {
  return new Intl.NumberFormat(EMAIL_LOCALE_META[locale].intlLocale, {
    style: "currency",
    currency: SAMPLE_CURRENCY[locale],
  }).format(value)
}

/** POST /admin/email-templates/preview — sablonu secilen dilde ornek veriyle render eder */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = (req.body || {}) as any
    const html = String(body.html || "")
    const subject = String(body.subject || "")
    const customData = body.data && typeof body.data === "object" ? body.data : {}
    const locale = normalizeEmailLocale(body.locale || DEFAULT_EMAIL_LOCALE)
    const ui = emailUiText(locale)
    const names = SAMPLE_NAMES[locale]
    const titles = SAMPLE_TITLES[locale]

    const storeSettings = req.scope.resolve("storeSettings") as any
    const storeName = await storeSettings.getSettingValue("store.name", "Mağaza")
    const supportEmail = await storeSettings.getSettingValue(
      "store.support_email",
      "support@example.com"
    )

    const keysHtml = buildTableHtml(
      [
        { title: titles[0], code: "AAAA-BBBB-CCCC-DDDD" },
        { title: titles[1], code: "EEEE-FFFF-GGGG-HHHH" },
      ].map((row) => ({
        title: escapeHtmlValue(row.title),
        code: `<code style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtmlValue(row.code)}</code>`,
      })),
      [
        { key: "title", label: ui.product },
        { key: "code", label: ui.key },
      ]
    )

    const itemsHtml = buildTableHtml(
      [
        { title: titles[0], quantity: "1", total: formatMoney(49.99, locale) },
        { title: titles[1], quantity: "2", total: formatMoney(29.99, locale) },
      ].map((row) => ({
        title: escapeHtmlValue(row.title),
        quantity: escapeHtmlValue(row.quantity),
        total: escapeHtmlValue(row.total),
      })),
      [
        { key: "title", label: ui.product },
        { key: "quantity", label: ui.quantity, align: "right" },
        { key: "total", label: ui.total, align: "right" },
      ]
    )

    const data: Record<string, any> = {
      store_name: storeName,
      support_email: supportEmail,
      site_url: "http://localhost:3000",
      year: new Date().getFullYear(),
      now: formatEmailDateTime(locale),
      locale,
      customer_name: names,
      order_number: "1042",
      total: formatMoney(109.97, locale),
      currency: SAMPLE_CURRENCY[locale],
      name: names,
      first_name: names.split(" ")[0],
      email: "customer@example.com",
      subject: locale === "tr" ? "Sipariş hakkında" : "About my order",
      message: SAMPLE_MESSAGES[locale],
      verification_url: "http://localhost:3000/verify-email?token=example-token",
      expires_hours: 24,
      keys_html: keysHtml,
      items_html: itemsHtml,
      ...customData,
    }

    res.json({
      subject: renderEmailString(subject, data, { escape: false }),
      html: renderEmailString(html, data, { escape: true }),
      locale,
      data,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Önizleme oluşturulamadı", error: error?.message })
  }
}
