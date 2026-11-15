'use client'

// Bot korumasi widget'i: Cloudflare Turnstile veya Google reCAPTCHA v2.
// token uretildiginde onToken cagrilir; resetKey degisince widget resetlenir
// (Turnstile tokenlari tek kullanimlik — hatali denemeden sonra yeniden cozulur).
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: any
    grecaptcha?: any
  }
}

const loadedScripts = new Set<string>()

function loadScript(src: string): Promise<void> {
  if (loadedScripts.has(src) && document.querySelector(`script[src="${src}"]`)) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.defer = true
    s.onload = () => {
      loadedScripts.add(src)
      resolve()
    }
    s.onerror = () => reject(new Error('captcha script yuklenemedi'))
    document.head.appendChild(s)
  })
}

interface CaptchaWidgetProps {
  provider: 'turnstile' | 'recaptcha'
  siteKey: string
  action?: string
  onToken: (token: string | null) => void
  /** arttirildiginda widget resetlenir (yeni token gerekir) */
  resetKey?: number
}

export default function CaptchaWidget({ provider, siteKey, action, onToken, resetKey = 0 }: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        if (provider === 'turnstile') {
          await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit')
          if (cancelled || !containerRef.current || !window.turnstile) return
          if (widgetIdRef.current !== null) {
            try { window.turnstile.remove(widgetIdRef.current) } catch {}
          }
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action: action || undefined,
            callback: (token: string) => onToken(token),
            'expired-callback': () => onToken(null),
            'error-callback': () => onToken(null),
          })
        } else {
          await loadScript('https://www.google.com/recaptcha/api.js?render=explicit')
          if (cancelled || !containerRef.current || !window.grecaptcha) return
          window.grecaptcha.ready(() => {
            if (cancelled || !containerRef.current) return
            if (widgetIdRef.current !== null) {
              try { window.grecaptcha.reset(widgetIdRef.current) } catch {}
            }
            widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
              sitekey: siteKey,
              callback: (token: string) => onToken(token),
              'expired-callback': () => onToken(null),
            })
          })
        }
      } catch {
        setFailed(true)
        onToken(null)
      }
    }
    void render()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, siteKey])

  // resetKey degisince (orn. hatali submit sonrasi) yeni token zorunlu
  useEffect(() => {
    if (resetKey === 0 || widgetIdRef.current === null) return
    try {
      if (provider === 'turnstile' && window.turnstile) window.turnstile.reset(widgetIdRef.current)
      if (provider === 'recaptcha' && window.grecaptcha) window.grecaptcha.reset(widgetIdRef.current)
      onToken(null)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  if (failed) {
    return <p className="text-red-400 text-sm">Bot doğrulaması yüklenemedi. Sayfayı yenileyin.</p>
  }

  return <div ref={containerRef} className="min-h-[65px]" data-action={action} />
}
