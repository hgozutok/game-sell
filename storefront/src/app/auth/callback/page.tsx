'use client'

// Sosyal giris callback landing — OAuth callback'i JWT ile buraya yonlendirir:
// /auth/callback?token=<jwt>&provider=google
// JWT medusa_auth_token olarak saklanir; musteri bilgisi /store/customers/me'den tazele

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { authService } from '@/lib/auth'

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}

function AuthCallbackInner() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('Oturum token bulunamadı.')
      return
    }
    authService.saveSocialSession(token)
    // musteri bilgilerini backend'den dogrula + lokal aynaya yaz
    api
      .get('/store/customers/me')
      .then((res) => {
        const customer = res.data?.customer
        if (customer) {
          localStorage.setItem('customer_id', customer.id)
          localStorage.setItem('customer_email', customer.email)
          localStorage.setItem('customer_first_name', customer.first_name || '')
          localStorage.setItem('customer_last_name', customer.last_name || '')
          window.location.href = '/account'
        } else {
          setError('Müşteri bilgisi alınamadı.')
        }
      })
      .catch((e: any) => {
        setError(e?.response?.data?.message || 'Oturum doğrulanamadı.')
      })
  }, [searchParams])

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center gaming-card p-10">
        {error ? (
          <>
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-black text-white mb-2">Sosyal giriş başarısız</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <a
              href="/login"
              className="inline-block bg-[#1a1d24] border border-gray-700 text-white px-8 py-3 rounded-lg font-bold hover:border-[#ff6b35] transition"
            >
              Giriş ekranına dön
            </a>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35] mx-auto mb-6"></div>
            <h1 className="text-2xl font-black text-white mb-2">Sosyal giriş tamamlanıyor…</h1>
            <p className="text-gray-400">Yönlendiriliyorsunuz.</p>
          </>
        )}
      </div>
    </div>
  )
}
