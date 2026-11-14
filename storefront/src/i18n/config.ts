// Desteklenen diller ve dil meta verileri.
// URL yapisi degismez; dil tercihi cerezde (NEXT_LOCALE) tutulur.

export type Locale = 'en' | 'tr' | 'de' | 'fr' | 'ar'

export type Direction = 'ltr' | 'rtl'

export const LOCALES: Locale[] = ['en', 'tr', 'de', 'fr', 'ar']

export const DEFAULT_LOCALE: Locale = 'en'

export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; flag: string; dir: Direction }
> = {
  en: { label: 'English', nativeLabel: 'English', flag: '🇬🇧', dir: 'ltr' },
  tr: { label: 'Turkish', nativeLabel: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  de: { label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  fr: { label: 'French', nativeLabel: 'Français', flag: '🇫🇷', dir: 'ltr' },
  ar: { label: 'Arabic', nativeLabel: 'العربية', flag: '🇸🇦', dir: 'rtl' },
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as string[]).includes(value)
}

/** "tr-TR", "en-US", "de" gibi degerleri desteklenen dile indirger. */
export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE
  const base = value.toLowerCase().split(/[-_]/)[0]
  return isLocale(base) ? base : DEFAULT_LOCALE
}

/** Accept-Language basligindan (q degerlerine gore) en uygun dili secer. */
export function matchAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE

  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      const quality = q ? Number(q.trim().slice(2)) : 1
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0 }
    })
    .filter((entry) => entry.tag && entry.tag !== '*')
    .sort((a, b) => b.quality - a.quality)

  for (const candidate of candidates) {
    const base = candidate.tag.split(/[-_]/)[0]
    if (isLocale(base)) return base
  }

  return DEFAULT_LOCALE
}

export function localeDir(locale: Locale): Direction {
  return LOCALE_META[locale]?.dir ?? 'ltr'
}

/** Intl API'leri icin bolge etiketi (tr -> tr-TR). */
export const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-GB',
  tr: 'tr-TR',
  de: 'de-DE',
  fr: 'fr-FR',
  ar: 'ar-SA-u-nu-latn',
}
