'use client'

import { useEffect } from 'react'
import { useLanguageStore } from '@/store/languageStore'

/** Aktif dili <html lang="..."> ozelligine yansitir (SEO + erisilebilirlik). */
export default function LangAttribute() {
  const locale = useLanguageStore((state) => state.locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
