'use client'

// Root layout'u bozuldugunda devreye giren en ust seviye hata sayfasi.
// Kendi <html>/<body> etiketlerini render etmek zorundadir.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="tr">
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
            'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>🛠️</div>
          <h1 style={{ fontSize: 30, margin: '0 0 12px' }}>Beklenmeyen bir hata oluştu</h1>
          <p style={{ color: '#9ca3af', margin: '0 0 24px', lineHeight: 1.6 }}>
            Mağaza şu anda yüklenemedi. Sayfayı yenilemeyi deneyin; sorun devam ederse destek ile
            iletişime geçin.
          </p>
          {error?.digest && (
            <p style={{ color: '#4b5563', fontSize: 12, fontFamily: 'monospace' }}>
              Hata kodu: {error.digest}
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
              Tekrar dene
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
              Ana sayfa
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
