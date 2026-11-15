'use client'

// URL query param destekleri:
//   ?lang=tr|en|de|fr|ar  -> dil (cookie + aninda uygulanir)
//   ?currency=usd|eur|gbp|try -> gosterim para birimi (currencyStore.loadCurrencyRates uygular)
// Ornek: /products?lang=de&currency=gbp
import { useEffect } from 'react'
import { useLocale } from '@/i18n/LocaleProvider'
import { LOCALE_COOKIE, type Locale } from '@/i18n/config'

const SUPPORTED_LANGS: Locale[] = ['en', 'tr', 'de', 'fr', 'ar']

export default function UrlParamsSync() {
  const locale = useLocale()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)

    const lang = params.get('lang')?.toLowerCase()
    if (lang && SUPPORTED_LANGS.includes(lang as Locale) && lang !== locale) {
      document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
      try {
        window.localStorage.setItem(LOCALE_COOKIE, lang)
      } catch {}
      document.documentElement.lang = lang
      // sunucu tarafindan gelen locale state'i tazelemek icin yumusak refresh
      window.location.reload()
    }
  }, [])

  return null
}
