import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, matchAcceptLanguage, resolveLocale, type Locale } from './config'
import { translate } from './index'
import type { TVars } from './types'

/**
 * Sunucu bilesenleri icin aktif dil.
 * Cerez yoksa Accept-Language basligina duser.
 */
export function getServerLocale(): Locale {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value
  if (cookieLocale) return resolveLocale(cookieLocale)
  return matchAcceptLanguage(headers().get('accept-language'))
}

/** Sunucu bilesenlerinde t('anahtar') yardimcisi. */
export function getServerT(): (key: string, vars?: TVars) => string {
  const locale = getServerLocale()
  return (key: string, vars?: TVars) => translate(locale, key, vars)
}
