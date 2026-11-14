import { INTL_LOCALE, LOCALE_COOKIE, LOCALE_META, resolveLocale, type Locale } from './config'
import { MESSAGES } from './messages'
import type { TVars } from './types'

export * from './config'
export { MESSAGES }
export type { MessageEntry, MessageTable, TVars } from './types'

/**
 * Anahtari aktif dile cevirir.
 * - Anahtar yoksa anahtarin kendisi (genellikle Ingilizce kaynak metin) dondurulur.
 * - Cogul: "tek|çok" ayrimi, vars.count === 1 ise ilk parca.
 * - Yer tutucu: {isim}
 */
export function translate(locale: Locale, key: string, vars?: TVars): string {
  const entry = MESSAGES[key]
  let value = entry ? entry[locale] || entry.en : key

  if (value.includes('|')) {
    const parts = value.split('|')
    const count = vars?.count === undefined ? NaN : Number(vars.count)
    value = Number.isFinite(count) && count === 1 ? parts[0] : parts[parts.length - 1]
  }

  if (vars) {
    value = value.replace(/\{(\w+)\}/g, (match, name: string) => {
      const replacement = vars[name]
      return replacement === undefined ? match : String(replacement)
    })
  }

  return value
}

/** Anahtar bes dilde de tanimli mi? (gelistirme/CI kontrolu icin) */
export function hasTranslation(key: string): boolean {
  const entry = MESSAGES[key]
  return Boolean(entry && entry.en && entry.tr && entry.de && entry.fr && entry.ar)
}

/** Cevirinin eksik oldugu dilleri dondurur. */
export function missingLocales(key: string): Locale[] {
  const entry = MESSAGES[key]
  if (!entry) return ['en', 'tr', 'de', 'fr', 'ar']
  return (Object.keys(LOCALE_META) as Locale[]).filter((locale) => !entry[locale])
}

/** Tarayicida (provider disinda, orn. global-error) dili cozer. */
export function getClientLocale(): Locale {
  if (typeof document === 'undefined') return 'en'

  const fromCookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
  if (fromCookie) return resolveLocale(fromCookie.split('=')[1])

  const fromStorage = window.localStorage.getItem(LOCALE_COOKIE)
  if (fromStorage) return resolveLocale(fromStorage)

  return resolveLocale(navigator.language)
}

/** Locale'e uygun sayi bicimi. */
export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value)
}

/** Locale'e uygun tarih bicimi. */
export function formatDate(
  value: string | number | Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  // "2025-08-21" gibi tarih-only degerler UTC'ye kaymasin diye yerel gece yarisina alinir.
  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], options).format(date)
}

/** Locale'e uygun para bicimi (kurus -> ana birim). */
export function formatCurrency(amount: number, currencyCode: string, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount)
}
