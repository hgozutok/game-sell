'use client'

import { getClientLocale, localeDir, translate } from '@/i18n'

// Root layout'u bozuldugunda devreye giren en ust seviye hata sayfasi.
// Kendi <html>/<body> etiketlerini render etmek zorundadir; provider yoktur,
// bu yuzden dil dogrudan cerezden cozulur.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const locale = getClientLocale()
  const t = (key: string, vars?: Record<string, string | number | undefined>) =>
    translate(locale, key, vars)

  return (
    <html lang={locale} dir={localeDir(locale)}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0b0d',
          color: '#fff',
          fontFamily:
            'Inter, system-ui, -apple-system, "Segoe UI", Tahoma, Roboto, Helvetica, Arial, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>🛠️</div>
          <h1 style={{ fontSize: 30, margin: '0 0 12px' }}>{t('globalError.title')}</h1>
          <p style={{ color: '#9ca3af', margin: '0 0 24px', lineHeight: 1.6 }}>
            {t('globalError.description')}
          </p>
          {error?.digest && (
            <p style={{ color: '#4b5563', fontSize: 12, fontFamily: 'monospace' }}>
              {t('error.code', { code: error.digest })}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => reset()}
              style={{
                background: 'linear-gradient(90deg,#ff6b35,#f7931e)',
                border: 0,
                color: '#fff',
                padding: '12px 22px',
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('error.retry')}
            </button>
            <a
              href="/"
              style={{
                background: '#1a1d24',
                border: '1px solid #374151',
                color: '#fff',
                padding: '12px 22px',
                borderRadius: 10,
                textDecoration: 'none',
              }}
            >
              {t('error.home')}
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
