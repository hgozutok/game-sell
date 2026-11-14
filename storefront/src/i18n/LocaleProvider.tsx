'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  INTL_LOCALE,
  LOCALE_COOKIE,
  localeDir,
  type Direction,
  type Locale,
} from './config'
import { translate } from './index'
import type { TVars } from './types'

interface LocaleContextValue {
  locale: Locale
  dir: Direction
  intlLocale: string
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: TVars) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function applyDocumentLang(locale: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = localeDir(locale)
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: ReactNode
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  // Sunucudan gelen dil ile istemci durumu farkliysa (ornegin geri/ileri gezinme) esitle.
  useEffect(() => {
    setLocaleState(initialLocale)
  }, [initialLocale])

  useEffect(() => {
    applyDocumentLang(locale)
  }, [locale])

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next)
      applyDocumentLang(next)

      if (typeof document !== 'undefined') {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
        try {
          window.localStorage.setItem(LOCALE_COOKIE, next)
        } catch {
          /* localStorage kullanilamiyorsa cerez yeterli */
        }
      }

      // Sunucu bilesenlerinin (metadata, <html lang>) yeni dile gecmesi icin yenile.
      router.refresh()
    },
    [router]
  )

  const t = useCallback((key: string, vars?: TVars) => translate(locale, key, vars), [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir: localeDir(locale), intlLocale: INTL_LOCALE[locale], setLocale, t }),
    [locale, setLocale, t]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useTranslation(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useTranslation, LocaleProvider icinde kullanilmalidir.')
  }
  return context
}

export function useLocale(): Locale {
  return useTranslation().locale
}
