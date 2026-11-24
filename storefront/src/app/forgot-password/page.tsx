'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { useT } from '@/components/useT'
import CaptchaWidget from '@/components/CaptchaWidget'

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  )
}

function ForgotPasswordInner() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [captcha, setCaptcha] = useState<{ provider: string; site_key: string | null }>({
    provider: 'none',
    site_key: null,
  })
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  useEffect(() => {
    void authService.getAuthProvidersConfig().then((config) => {
      setCaptcha(config.captcha)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (captcha.provider !== 'none' && captcha.site_key && !captchaToken) {
      setError('Lütfen bot doğrulamasını tamamlayın.')
      setLoading(false)
      return
    }

    try {
      const normalizedEmail = email.trim().toLowerCase()
      await authService.forgotPassword(normalizedEmail, captchaToken)
      setSent(true)
    } catch (err: any) {
      if (captcha.provider !== 'none') setCaptchaResetKey((k) => k + 1)
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'İşlem gerçekleştirilemedi. Lütfen daha sonra tekrar deneyin.'
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
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">{t('forgot.title')}</h1>
          <p className="text-gray-400 text-sm">{t('forgot.subtitle')}</p>
        </div>

        <div className="gaming-card p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-bold text-white mb-2">{t('forgot.successTitle')}</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                {t('forgot.successDesc')}
              </p>
              <Link
                href="/login"
                className="inline-block w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold hover:shadow-lg transition text-center"
              >
                {t('forgot.backToLogin')}
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('forgot.email')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  maxLength={254}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none transition"
                  placeholder="you@example.com"
                />
              </div>

              {captcha.provider !== 'none' && captcha.site_key && (
                <div>
                  <CaptchaWidget
                    provider={captcha.provider as 'turnstile' | 'recaptcha'}
                    siteKey={captcha.site_key}
                    action="forgot_password"
                    onToken={setCaptchaToken}
                    resetKey={captchaResetKey}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(captcha.provider !== 'none' && captcha.site_key && !captchaToken)}
                className="w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-[#ff6b35]/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {loading ? t('forgot.sending') : t('forgot.submit')}
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
