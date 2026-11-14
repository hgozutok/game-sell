'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LOCALES, LOCALE_META } from '@/i18n/config'
import { useTranslation } from '@/i18n/LocaleProvider'

const MENU_WIDTH = 240
const EDGE_GAP = 8

/**
 * Bes dilli dil secici. Secim cerez + localStorage'a yazilir,
 * sunucu bilesenleri router.refresh() ile yeni dili alir.
 *
 * Menu, viewport disina tasmamasi icin fixed konumlandirilir; LTR/RTL
 * fark etmeksizin butonun kenarina hizalanip ekran icine kirpilir.
 * Bayrak emojisi yerine dil kodu rozeti kullanilir (Windows bayraklari
 * harf ciftine dusuruyor).
 */
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ left: 0, top: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const active = LOCALE_META[locale]

  const positionMenu = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const viewportWidth = window.innerWidth
    const maxLeft = Math.max(EDGE_GAP, viewportWidth - MENU_WIDTH - EDGE_GAP)
    // Butonun sag kenarina hizala, sol kenara tasarsa iceride tut.
    const left = Math.min(Math.max(EDGE_GAP, rect.right - MENU_WIDTH), maxLeft)
    setCoords({ left, top: rect.bottom + EDGE_GAP })
  }, [])

  const toggle = () => {
    if (!open) positionMenu()
    setOpen((value) => !value)
  }

  useEffect(() => {
    if (!open) return

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const close = () => setOpen(false)

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('resize', positionMenu)
    window.addEventListener('scroll', close, true)

    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('resize', positionMenu)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, positionMenu])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('nav.languageLabel')}: ${active.nativeLabel}`}
        title={t('nav.languageLabel')}
        className={
          compact
            ? 'px-2 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition flex items-center gap-1 text-xs font-bold'
            : 'px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition flex items-center gap-2 text-sm font-medium'
        }
      >
        <span className="inline-flex h-5 min-w-[1.75rem] items-center justify-center rounded bg-[#ff6b35]/15 px-1 text-[11px] font-black tracking-wide text-[#ff6b35]">
          {locale.toUpperCase()}
        </span>
        {!compact && <span>{active.nativeLabel}</span>}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label={t('nav.languageLabel')}
          style={{ position: 'fixed', left: coords.left, top: coords.top, width: MENU_WIDTH }}
          className="bg-[#1a1d24] border border-gray-700 rounded-lg shadow-2xl z-[60] overflow-hidden py-1"
        >
          {LOCALES.map((code) => {
            const meta = LOCALE_META[code]
            const isActive = code === locale
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setLocale(code)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-start transition ${
                  isActive ? 'bg-[#ff6b35]/15 text-[#ff6b35]' : 'text-gray-300 hover:bg-[#ff6b35] hover:text-white'
                }`}
              >
                <span
                  className={`inline-flex h-6 min-w-[2rem] items-center justify-center rounded px-1 text-[11px] font-black tracking-wide ${
                    isActive ? 'bg-[#ff6b35]/25 text-[#ff6b35]' : 'bg-[#0a0b0d] text-gray-400'
                  }`}
                >
                  {code.toUpperCase()}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{meta.nativeLabel}</span>
                  <span className={`block text-[11px] ${isActive ? 'text-[#ff6b35]/80' : 'text-gray-500'}`}>
                    {meta.label}
                    {meta.dir === 'rtl' ? ' · RTL' : ''}
                  </span>
                </span>
                {isActive && <span className="text-green-500 text-sm">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
