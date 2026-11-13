'use client'

import { useLanguageStore } from '@/store/languageStore'

export default function LanguageSwitcher() {
  const locale = useLanguageStore((state) => state.locale)
  const toggleLocale = useLanguageStore((state) => state.toggleLocale)

  return (
    <button
      onClick={toggleLocale}
      title={locale === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
      className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition font-medium text-sm"
    >
      {locale === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}
    </button>
  )
}
