import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, matchAcceptLanguage, resolveLocale, type Locale } from './config'
import { translate } from './index'
import type { TVars } from './types'

/**
 * Sunucu bilesenleri icin aktif dil.
 * Cerez yoksa Accept-Language basligina duser.
 */
export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  if (cookieLocale) return resolveLocale(cookieLocale)
  const headerStore = await headers()
  return matchAcceptLanguage(headerStore.get('accept-language'))
}

/** Sunucu bilesenlerinde t('anahtar') yardimcisi. */
export async function getServerT(): Promise<(key: string, vars?: TVars) => string> {
  const locale = await getServerLocale()
  return (key: string, vars?: TVars) => translate(locale, key, vars)
}
