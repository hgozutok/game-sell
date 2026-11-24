'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authService } from '@/lib/auth'
import { useT } from '@/components/useT'

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}

function ResetPasswordInner() {
  const t = useT()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError(t('reset.invalidToken'))
      return
    }

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.')
      return
    }

    if (password !== confirmPassword) {
      setError(t('reset.passwordMismatch'))
      return
    }

    setLoading(true)

    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        t('reset.invalidToken')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl mb-4">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">{t('reset.title')}</h1>
          <p className="text-gray-400 text-sm">{t('reset.subtitle')}</p>
        </div>

        <div className="gaming-card p-8">
          {!token ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-white mb-2">Geçersiz Bağlantı</h2>
              <p className="text-gray-400 text-sm mb-6">
                {t('reset.invalidToken')}
              </p>
              <Link
                href="/forgot-password"
                className="inline-block w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold hover:shadow-lg transition text-center"
              >
                Yeni Bağlantı Talep Et
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-white mb-2">{t('reset.successTitle')}</h2>
              <p className="text-gray-400 text-sm mb-6">
                {t('reset.successDesc')}
              </p>
              <Link
                href="/login"
                className="inline-block w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold hover:shadow-lg transition text-center"
              >
                {t('login.signIn')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('reset.newPassword')}
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('reset.confirmPassword')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-[#ff6b35]/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {loading ? t('reset.updating') : t('reset.submit')}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-[#ff6b35] hover:text-[#ff7b45] transition"
                >
                  ← {t('forgot.backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
