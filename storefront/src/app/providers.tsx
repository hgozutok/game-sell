'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/contexts/AuthContext'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import UrlParamsSync from '@/components/UrlParamsSync'
import { loadCartLimit } from '@/lib/cart-limit'
import type { Locale } from '@/i18n/config'

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale: Locale
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  // Sepet ust limitini uygulama baslangicinda yukle (cartStore guard'i kullanir)
  useEffect(() => {
    void loadCartLimit()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider initialLocale={initialLocale}>
        <UrlParamsSync />
        {/* Global toast — toast cagiran her sayfa icin tek Toaster */}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#15171c',
              color: '#fff',
              border: '1px solid #ff6b35',
            },
          }}
        />
        <AuthProvider>{children}</AuthProvider>
      </LocaleProvider>
    </QueryClientProvider>
  )
}
