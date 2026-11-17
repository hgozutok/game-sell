'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

/**
 * Google Analytics 4 (gtag.js) — olcum kimligi admin panelinden
 * (analytics.google_measurement_id) yonetilir; bos/kapali ise hic yuklenmez.
 * Layout'ta server tarafindan cozulur, Script afterInteractive ile yuklenir.
 */
export default function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const [consentAllowed, setConsentAllowed] = useState(false)

  useEffect(() => {
    // Cerez onayi: analytics kategorisine izin verilmisse yukle
    try {
      const raw = document.cookie.match(/(?:^|;\s*)cookie_consent=([^;]+)/)?.[1]
      if (!raw) {
        // Onay cerezi yoksa da yukle (onay istemi yok sayilir — mevcut davranis)
        setConsentAllowed(true)
        return
      }
      const consent = JSON.parse(decodeURIComponent(raw))
      setConsentAllowed(consent?.analytics !== false)
    } catch {
      setConsentAllowed(true)
    }
  }, [])

  if (!measurementId || !consentAllowed) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  )
}
