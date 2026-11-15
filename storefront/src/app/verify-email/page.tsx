'use client'

// E-posta dogrulama landing — register e-postasindaki baglanti buraya duser:
// /verify-email?token=<hex>
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authService } from '@/lib/auth'

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  )
}

function VerifyEmailInner() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setState('error')
      setMessage('Doğrulama bağlantısı geçersiz (token eksik).')
      return
    }
    authService
      .verifyEmail(token)
      .then(() => setState('success'))
      .catch((err: any) => {
        setState('error')
        setMessage(err?.response?.data?.message || 'Doğrulama başarısız oldu.')
      })
  }, [searchParams])

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center gaming-card p-10">
        {state === 'verifying' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35] mx-auto mb-6"></div>
            <h1 className="text-2xl font-black text-white mb-2">E-posta doğrulanıyor…</h1>
            <p className="text-gray-400">Lütfen bekleyin.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-black text-white mb-2">E-postanız doğrulandı!</h1>
            <p className="text-gray-400 mb-6">Hesabınız aktifleştirildi. Artık giriş yapabilirsiniz.</p>
            <Link
              href="/login"
              className="inline-block bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-[#ff6b35]/40 transition"
            >
              Giriş Yap
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-black text-white mb-2">Doğrulama başarısız</h1>
            <p className="text-gray-400 mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-block bg-[#1a1d24] border border-gray-700 text-white px-8 py-3 rounded-lg font-bold hover:border-[#ff6b35] transition"
            >
              Giriş ekranına dön
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
