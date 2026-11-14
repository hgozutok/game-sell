'use client'

import { useTranslation } from '@/i18n/LocaleProvider'
import type { TVars } from '@/i18n/types'

/**
 * t('anahtar') — aktif dile gore ceviri dondurur.
 * t('Anahtar {count}', { count }) — cogul/yer tutucu destekli.
 */
export function useT(): (key: string, vars?: TVars) => string {
  return useTranslation().t
}
