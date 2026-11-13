'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  adminLogout,
  getAdminEmail,
  getAdminToken,
  verifyAdminSession,
} from '@/lib/admin-api'

const navGroups: Array<{
  title: string
  items: Array<{ label: string; href: string; icon: string }>
}> = [
  {
    title: 'Mağaza',
    items: [
      { label: 'Genel Bakış', href: '/admin/dashboard', icon: '📊' },
      { label: 'Ürünler', href: '/admin/dashboard/products', icon: '📦' },
      { label: 'Siparişler', href: '/admin/dashboard/orders', icon: '🧾' },
      { label: 'Dijital Anahtarlar', href: '/admin/dashboard/keys', icon: '🔑' },
    ],
  },
  {
    title: 'Tedarik',
    items: [
      { label: 'Kinguin', href: '/admin/dashboard/kinguin', icon: '🎮' },
      { label: 'Ürün İçe Aktarma', href: '/admin/dashboard/products/import', icon: '📥' },
      { label: 'Senkronizasyon', href: '/admin/dashboard/sync', icon: '🔄' },
    ],
  },
  {
    title: 'Ticaret',
    items: [
      { label: 'Fiyatlandırma', href: '/admin/dashboard/pricing', icon: '💰' },
      { label: 'Para Birimleri', href: '/admin/dashboard/currency-rates', icon: '💱' },
      { label: 'Ödeme Sistemleri', href: '/admin/dashboard/payments', icon: '💳' },
    ],
  },
  {
    title: 'İçerik & Sistem',
    items: [
      { label: 'Slider', href: '/admin/dashboard/slider', icon: '🖼️' },
      { label: 'Mağaza Ayarları', href: '/admin/dashboard/settings', icon: '⚙️' },
    ],
  },
]

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<'checking' | 'ok'>('checking')
  const [email, setEmail] = useState<string>('')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let active = true

    if (!getAdminToken()) {
      window.location.href = '/admin'
      return
    }

    verifyAdminSession().then((ok) => {
      if (!active) return
      if (!ok) {
        window.location.href = '/admin'
        return
      }
      setEmail(getAdminEmail() || '')
      setStatus('ok')
    })

    return () => {
      active = false
    }
  }, [])

  // Sayfa degisince mobil menuyu kapat
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]" />
      </div>
    )
  }

  const isActive = (href: string) =>
    href === '/admin/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-[#15171c] border-b border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg"
            aria-label="Menü"
          >
            ☰
          </button>
          <span className="text-white font-black">🛡️ Admin</span>
          <button
            onClick={() => {
              adminLogout()
              window.location.href = '/admin'
            }}
            className="text-sm text-gray-400 hover:text-white"
          >
            Çıkış
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#15171c] border-r border-gray-800 overflow-y-auto transition-transform md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-gray-800">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <span className="w-10 h-10 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-lg flex items-center justify-center text-xl">
              🛡️
            </span>
            <span>
              <span className="block text-white font-black leading-tight">Admin Panel</span>
              <span className="block text-xs text-gray-500">Digital Game Store</span>
            </span>
          </Link>
        </div>

        <nav className="p-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                {group.title}
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                        isActive(item.href)
                          ? 'bg-[#ff6b35]/15 text-[#ff6b35] font-semibold'
                          : 'text-gray-400 hover:bg-[#1a1d24] hover:text-white'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-3">
          <div className="text-xs text-gray-500 truncate" title={email}>
            {email || 'admin'}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex-1 text-center px-3 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg text-xs hover:border-[#ff6b35] transition"
            >
              Mağaza
            </Link>
            <button
              onClick={() => {
                adminLogout()
                window.location.href = '/admin'
              }}
              className="flex-1 px-3 py-2 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition"
            >
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          aria-label="Menüyü kapat"
        />
      )}

      <main className="md:pl-64">{children}</main>
    </div>
  )
}
