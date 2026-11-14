'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useT } from '@/components/useT'

type StoreSettings = {
  store?: {
    name?: string
    whatsapp_number?: string
    whatsapp_message?: string
  }
}

function toWaNumber(raw: string) {
  // +90 555 111 22 33 -> 905551112233
  return raw.replace(/[^\d]/g, '')
}

export default function WhatsAppButton() {
  const t = useT()
  const [number, setNumber] = useState('')
  const [message, setMessage] = useState('')
  const [storeName, setStoreName] = useState('')
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  useEffect(() => {
    let active = true
    api
      .get<StoreSettings>('/store/settings')
      .then((res) => {
        if (!active) return
        const s = res.data?.store
        const normalized = toWaNumber(s?.whatsapp_number || '')
        if (normalized) {
          setNumber(normalized)
          setMessage(s?.whatsapp_message || '')
          setStoreName(s?.name || '')
          setText(s?.whatsapp_message || '')
        }
      })
      .catch(() => {
        /* ayar yoksa buton gorunmez */
      })
    return () => {
      active = false
    }
  }, [])

  if (!number) return null

  const link = `https://wa.me/${number}?text=${encodeURIComponent(text || message)}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('whatsapp.open')}
        className="fixed bottom-5 end-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg shadow-black/40 transition hover:scale-105 hover:bg-[#1ebe5d]"
      >
        <svg viewBox="0 0 32 32" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.55 4.13 1.6 5.93L4 29l8.2-1.55a12 12 0 0 0 3.84.63h.01C22.68 28.08 28 22.68 28 16.04 28 8.4 22.68 3 16.04 3zm0 22.7h-.01a10 10 0 0 1-5.1-1.4l-.36-.21-4.86.92.93-4.74-.24-.38a9.9 9.9 0 0 1-1.52-5.3c0-5.5 4.48-9.98 9.99-9.98 5.5 0 9.98 4.48 9.98 9.99 0 5.5-4.48 9.98-9.98 9.98zm5.48-7.48c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.08.15.2 2.08 3.19 5.04 4.48.7.3 1.25.48 1.68.62.71.23 1.35.2 1.86.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
        </svg>
        <span className="hidden text-sm font-bold sm:block">WhatsApp</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <button
            aria-label={t('whatsapp.close')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-800 bg-[#15171c] shadow-2xl">
            <div className="flex items-center justify-between bg-[#075E54] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-lg">
                  💬
                </span>
                <div>
                  <div className="text-sm font-bold text-white">{storeName || t('whatsapp.support')}</div>
                  <div className="text-[11px] text-emerald-100">{t('whatsapp.replyTime')}</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white"
                aria-label={t('whatsapp.close')}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 p-4">
              <p className="text-sm text-gray-300">
                {t('whatsapp.intro')}
              </p>
              <label className="block text-xs uppercase tracking-wide text-gray-500" htmlFor="wa-message">
                {t('whatsapp.messageLabel')}
              </label>
              <textarea
                id="wa-message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-700 bg-[#1a1d24] px-3 py-2 text-sm text-white focus:border-[#25D366] focus:outline-none"
                placeholder={t('whatsapp.placeholder')}
              />
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1ebe5d]"
              >
                {t('whatsapp.send')}
              </a>
              <p className="text-center text-[11px] text-gray-600">
                {number.replace(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/, '+$1 $2 $3 $4 $5')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
