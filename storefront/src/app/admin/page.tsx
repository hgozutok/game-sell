'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Simple admin auth - in production, verify against database
      if (formData.email === 'admin@store.com' && formData.password === 'admin123') {
        // Generate a simple token for this session
        const token = 'admin_' + btoa(formData.email + ':' + Date.now())
        
        localStorage.setItem('admin_authenticated', 'true')
        localStorage.setItem('admin_email', formData.email)
        localStorage.setItem('admin_token', token)
        
        console.log('✅ Admin login successful, redirecting to dashboard')
        
        // Use window.location for hard redirect (most reliable)
        window.location.href = '/admin/dashboard'
      } else {
        setError('Geçersiz email veya şifre')
      }
    } catch (err: any) {
      setError('Giriş başarısız oldu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Admin Panel</h1>
          <p className="text-gray-400">Mağaza yönetim paneline giriş</p>
        </div>

        <div className="gaming-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-purple-500 focus:outline-none transition"
                placeholder="admin@store.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Şifre
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-purple-500 focus:outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            >
              {loading ? 'Giriş Yapılıyor...' : '🛡️ Admin Panele Giriş'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">🔑 Varsayılan Giriş Bilgileri:</p>
            <p className="text-sm text-gray-400 font-mono">
              Email: admin@store.com<br />
              Password: admin123
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 mb-2">veya</p>
            <a
              href="http://localhost:9000/app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-500 hover:text-purple-400 inline-flex items-center gap-1"
            >
              Medusa Backend Admin →
              <span className="text-xs">(Gelişmiş)</span>
            </a>
          </div>
        </div>

        <p className="text-center text-gray-400 mt-6">
          <Link href="/" className="text-purple-500 hover:text-purple-400 font-semibold">
            ← Mağazaya Dön
          </Link>
        </p>
      </div>
    </div>
  )
}
