'use client'

import { useLanguageStore } from '@/store/languageStore'
import { translate, type Locale } from '@/lib/i18n'

/** t('nav.allGames') — aktif dile göre çeviri döndürür. */
export function useT(): (key: string) => string {
  const locale = useLanguageStore((state) => state.locale)
  return (key: string) => translate(key, locale as Locale)
}
