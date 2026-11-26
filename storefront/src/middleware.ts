import { NextResponse, type NextRequest } from 'next/server'
import { LOCALE_COOKIE, matchAcceptLanguage } from '@/i18n/config'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/**
 * Ilk ziyarette tarayici diline gore cerez yazar; sonraki isteklerde
 * sunucu bilesenleri ayni dili render eder.
 *
 * Ayrica istek yolunu `x-pathname` istek basligi ile sunucu bilesenlerine
 * tasir: root layout headers() ile yolu edinemedigi icin canonical ve og:url
 * bu basligi izler (bkz. app/layout.tsx).
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  if (!request.cookies.get(LOCALE_COOKIE)) {
    const locale = matchAcceptLanguage(request.headers.get('accept-language'))
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: [
    // Statik dosyalar ve Next dahili yollari disinda her istek.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|woff|woff2|ttf)$).*)',
  ],
}
