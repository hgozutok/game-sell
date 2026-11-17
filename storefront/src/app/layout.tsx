import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import SiteChrome from '@/components/layout/SiteChrome'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import {
  INTL_LOCALE,
  LOCALE_COOKIE,
  localeDir,
  matchAcceptLanguage,
  resolveLocale,
  translate,
  type Locale,
} from '@/i18n'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

// Server-side istekler icin backend adresi (konteynerde compose agi)
const SERVER_API_URL =
  process.env.MEDUSA_BACKEND_URL_SERVER ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ''

/** Admin paneldeki analytics.google_measurement_id ayarini okur (60 sn cache). */
async function getGaMeasurementId(): Promise<string> {
  try {
    const res = await fetch(`${SERVER_API_URL}/store/settings`, {
      headers: PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {},
      // Kisa cache: build-time'da yakalanan bos deger hizla tazelenir,
      // admin panel degisikligi ~1 dk icinde yayina girer.
      next: { revalidate: 60 },
    })
    if (!res.ok) return ''
    const data = await res.json()
    return String(data?.analytics?.google_measurement_id || '').trim()
  } catch {
    return ''
  }
}

/** Aktif dili cerezden, yoksa tarayici dilinden cozer. */
function resolveRequestLocale(): Locale {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value
  if (cookieLocale) return resolveLocale(cookieLocale)
  return matchAcceptLanguage(headers().get('accept-language'))
}

// Next layout'ta tanimli disa aktarim listesi disina cikmamak icin const kalir
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export function generateMetadata(): Metadata {
  const locale = resolveRequestLocale()
  const title = translate(locale, 'meta.title')
  const description = translate(locale, 'meta.description')

  return {
    // Alt sayfalarda sadece kendi basligini verir; %s yerine genisletilir
    title: {
      default: title,
      template: '%s | HUPIPLAY',
    },
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: INTL_LOCALE[locale].replace('-', '_'),
      siteName: 'HUPIPLAY',
      url: SITE_URL,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    other: {
      'content-language': locale,
    },
  }
}

/** Site geneli yapisal veri: Organization + WebSite (arama eylemi ile) */
function SiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'HUPIPLAY',
        url: SITE_URL,
        description: 'Digital game key marketplace with instant delivery',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'HUPIPLAY',
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = resolveRequestLocale()
  const dir = localeDir(locale)
  const gaMeasurementId = await getGaMeasurementId()

  return (
    <html lang={locale} dir={dir} className="scroll-smooth">
      <body className={`${inter.className} antialiased bg-[#0a0b0d]`}>
        <Providers initialLocale={locale}>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
        <SiteJsonLd />
        <GoogleAnalytics measurementId={gaMeasurementId} />
      </body>
    </html>
  )
}
