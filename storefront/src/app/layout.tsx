import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import SiteChrome from '@/components/layout/SiteChrome'
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

/** Aktif dili cerezden, yoksa tarayici dilinden cozer. */
function resolveRequestLocale(): Locale {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value
  if (cookieLocale) return resolveLocale(cookieLocale)
  return matchAcceptLanguage(headers().get('accept-language'))
}

export function generateMetadata(): Metadata {
  const locale = resolveRequestLocale()
  const title = translate(locale, 'meta.title')
  const description = translate(locale, 'meta.description')

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: INTL_LOCALE[locale].replace('-', '_'),
      siteName: 'HUPIPLAY',
    },
    other: {
      'content-language': locale,
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = resolveRequestLocale()
  const dir = localeDir(locale)

  return (
    <html lang={locale} dir={dir} className="scroll-smooth">
      <body className={`${inter.className} antialiased bg-[#0a0b0d]`}>
        <Providers initialLocale={locale}>
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  )
}
