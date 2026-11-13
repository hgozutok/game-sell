import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Locale } from '@/lib/i18n'

interface LanguageState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: 'tr',
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === 'tr' ? 'en' : 'tr' }),
    }),
    { name: 'language-storage' }
  )
)
