'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authService } from '@/lib/auth'
import { useT } from '@/components/useT'
import CaptchaWidget from '@/components/CaptchaWidget'

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

export default function RegisterPage() {
  const t = useT()
  const router = useRouter()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState<{ provider: string; site_key: string | null }>({ provider: 'none', site_key: null })
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [socialProviders, setSocialProviders] = useState<Array<{ provider: string; enabled: boolean }>>([])

  useEffect(() => {
    void authService.getAuthProvidersConfig().then((config) => {
      setCaptcha(config.captcha)
      setSocialProviders(config.providers || [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Bot korumasi aciksa token zorunlu
    if (captcha.provider !== 'none' && captcha.site_key && !captchaToken) {
      setError('Lütfen bot doğrulamasını tamamlayın.')
      setLoading(false)
      return
    }

    try {
      // Create customer account using auth service
      const { requiresVerification } = await authService.register({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
      }, captchaToken)

      if (requiresVerification) {
        // E-posta dogrulamasi bekleniyor — login ekranina bilgiyle don
        window.location.href = `/login?verify_pending=${encodeURIComponent(formData.email)}`
        return
      }

      console.log('✅ Registration successful, redirecting to /account')
      // Use window.location for hard redirect (most reliable)
      window.location.href = '/account'
    } catch (err: any) {
      console.error('Registration error:', err)
      // captcha token tek kullanimlik — hatadan sonra yeni token icin reset
      setCaptchaResetKey((k) => k + 1)
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      })
      
      let errorMessage = t('register.failed')
      
      if (err.message === 'Network Error') {
        errorMessage = t('register.networkError', { url: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000' })
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl mb-4">
            <span className="text-3xl">🎮</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">{t('register.title')}</h1>
          <p className="text-gray-400">{t('register.subtitle')}</p>
        </div>

        {/* Register Form */}
        <div className="gaming-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('register.firstName')}
                </label>
                <input
                  id="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none transition"
                  placeholder="John"
                />
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-2">
                  {t('register.lastName')}
                </label>
                <input
                  id="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none transition"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.phone')} <span className="text-gray-500">{t('register.optional')}</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none transition"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {t('register.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none transition"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">{t('register.passwordHint')}</p>
            </div>

            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="w-4 h-4 mt-1 bg-[#1a1d24] border border-gray-700 rounded text-[#ff6b35] focus:ring-[#ff6b35]"
              />
              <label htmlFor="terms" className="ms-2 text-sm text-gray-400">
                {t('register.agreePrefix')}{' '}
                <Link href="/terms" className="text-[#ff6b35] hover:text-[#ff7b45]">
                  {t('footer.terms')}
                </Link>{' '}
                {t('register.agreeAnd')}{' '}
                <Link href="/privacy" className="text-[#ff6b35] hover:text-[#ff7b45]">
                  {t('footer.privacy')}
                </Link>
              </label>
            </div>

            {/* Bot korumasi — admin panelde aciksa widget gorunur */}
            {captcha.provider !== 'none' && captcha.site_key && (
              <div>
                <CaptchaWidget
                  provider={captcha.provider as 'turnstile' | 'recaptcha'}
                  siteKey={captcha.site_key}
                  action="register"
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
              {loading ? t('register.creatingAccount') : t('register.createAccount')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#15171c] text-gray-400">{t('login.or')}</span>
            </div>
          </div>

          {/* Social Register */}
          <div className="space-y-3">
            {socialProviders.some((p) => p.provider === 'google' && p.enabled) && (
              <a
                href={`${BACKEND}/auth/oauth/google`}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t('login.google')}
              </a>
            )}

            {socialProviders.some((p) => p.provider === 'facebook' && p.enabled) && (
              <a
                href={`${BACKEND}/auth/oauth/facebook`}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 3.667h-3.533v7.98H9.101z"/>
                </svg>
                {t('login.facebook')}
              </a>
            )}
          </div>
        </div>

        {/* Login Link */}
        <p className="text-center text-gray-400 mt-6">
          {t('register.haveAccount')}{' '}
          <Link href="/login" className="text-[#ff6b35] hover:text-[#ff7b45] font-semibold">
            {t('register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}

