/**
 * E-posta sablonlarinda desteklenen diller.
 * Storefront ile ayni kume: en, tr, de, fr, ar.
 * Dili tespit edilemeyen alicilara her zaman Ingilizce gonderilir.
 */

export const SUPPORTED_EMAIL_LOCALES = ["en", "tr", "de", "fr", "ar"] as const

export type EmailLocale = (typeof SUPPORTED_EMAIL_LOCALES)[number]

export const DEFAULT_EMAIL_LOCALE: EmailLocale = "en"

export const EMAIL_LOCALE_META: Record<
  EmailLocale,
  { label: string; nativeLabel: string; dir: "ltr" | "rtl"; intlLocale: string }
> = {
  en: { label: "English", nativeLabel: "English", dir: "ltr", intlLocale: "en-GB" },
  tr: { label: "Turkish", nativeLabel: "Türkçe", dir: "ltr", intlLocale: "tr-TR" },
  de: { label: "German", nativeLabel: "Deutsch", dir: "ltr", intlLocale: "de-DE" },
  fr: { label: "French", nativeLabel: "Français", dir: "ltr", intlLocale: "fr-FR" },
  ar: { label: "Arabic", nativeLabel: "العربية", dir: "rtl", intlLocale: "ar-SA-u-nu-latn" },
}

export function isEmailLocale(value: unknown): value is EmailLocale {
  return (
    typeof value === "string" &&
    (SUPPORTED_EMAIL_LOCALES as readonly string[]).includes(value)
  )
}

/**
 * "tr-TR", "en_US", "de" gibi degerleri desteklenen dile indirger.
 * Desteklenmeyen degerler icin null doner.
 */
export function toEmailLocale(value: unknown): EmailLocale | null {
  if (typeof value !== "string") return null
  const base = value.trim().toLowerCase().replace(/_/g, "-").split("-")[0]
  return isEmailLocale(base) ? base : null
}

/** Degeri desteklenen bir dile cevirir; tespit edilemezse Ingilizce'ye duser. */
export function normalizeEmailLocale(value: unknown): EmailLocale {
  return toEmailLocale(value) ?? DEFAULT_EMAIL_LOCALE
}

/** Accept-Language basligindan (q degerlerine gore) en uygun dili secer. */
export function resolveEmailLocaleFromAcceptLanguage(
  header: string | null | undefined
): EmailLocale {
  if (!header) return DEFAULT_EMAIL_LOCALE

  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";")
      const q = params.find((p) => p.trim().startsWith("q="))
      const quality = q ? Number(q.trim().slice(2)) : 1
      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
      }
    })
    .filter((entry) => entry.tag && entry.tag !== "*")
    .sort((a, b) => b.quality - a.quality)

  for (const candidate of candidates) {
    const locale = toEmailLocale(candidate.tag)
    if (locale) return locale
  }

  return DEFAULT_EMAIL_LOCALE
}
