'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useAuth } from '@/contexts/AuthContext'
import { useT } from '@/components/useT'
import { useLocale } from '@/i18n/LocaleProvider'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { api } from '@/lib/api'

export default function Header() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [storeInfo, setStoreInfo] = useState<{
    name?: string
    logo_url?: string
    announcement?: { enabled?: boolean; texts?: Record<string, string> }
  }>({})
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const { customer, logout } = useAuth()
  const t = useT()
  const locale = useLocale()
  const { selectedCurrency, currencies, setSelectedCurrency, loadCurrencyRates } = useCurrencyStore()

  // Ust duyuru seridi: admin panelden metin veya "gizle" gelebilir.
  const announcement = storeInfo.announcement
  const customBanner = (announcement?.texts?.[locale] || '').trim()
  const bannerText = announcement?.enabled === false ? '' : customBanner || t('nav.banner')

  // Magaza adi + logo (admin ayarlarindan)
  useEffect(() => {
    api
      .get('/store/settings')
      .then((res) => setStoreInfo(res.data?.store || {}))
      .catch(() => {
        /* varsayilan marka kullanilir */
      })
  }, [])
  
  // Prevent hydration mismatch by only reading cart count on client side
  useEffect(() => {
    setCartItemCount(getTotalItems())
  }, [getTotalItems])
  
  // Load currency rates from backend on mount
  useEffect(() => {
    loadCurrencyRates()
  }, [])
  
  // Subscribe to cart changes
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe((state) => {
      setCartItemCount(state.getTotalItems())
    })
    return unsubscribe
  }, [])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Navigate to search results when debounced query changes
  // ÖNEMLI: kullanici bu oturumda arama yazmadiysa /search sayfasinda kalınmalı —
  // aksi halde /search?q=... dogrudan acilinca (refresh/link) /products'a firlar.
  const searchTouchedRef = useRef(false)

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      router.push(`/search?q=${encodeURIComponent(debouncedSearch)}`)
    } else if (
      searchTouchedRef.current &&
      debouncedSearch.length === 0 &&
      window.location.pathname === '/search'
    ) {
      router.push('/products')
    }
  }, [debouncedSearch, router])

  const handleLogout = async () => {
    await logout()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-[#15171c] border-b border-gray-800 sticky top-0 z-50">
      {/* Top Banner */}
      {bannerText && (
        <div
          dir="auto"
          className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white text-center py-2 text-sm font-semibold"
        >
          {bannerText}
        </div>
      )}
      
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            {storeInfo.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={storeInfo.logo_url}
                alt={storeInfo.name || 'HUPIPLAY'}
                className="h-9 sm:h-11 max-w-[130px] sm:max-w-[180px] object-contain group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="flex flex-col justify-center">
                <span className="text-xl sm:text-2xl font-black tracking-wider text-white group-hover:text-[#ff6b35] transition">
                  {storeInfo.name ? storeInfo.name : <>HUPI<span className="text-[#ff6b35]">PLAY</span></>}
                </span>
                <span className="hidden sm:block text-[10px] text-gray-400 font-medium tracking-wide -mt-0.5">
                  {t('nav.brandTagline')}
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            <Link href="/products" className="text-gray-300 hover:text-[#ff6b35] transition font-medium">
              {t('nav.allGames')}
            </Link>
            <Link href="/categories" className="text-gray-300 hover:text-[#ff6b35] transition font-medium">
              {t('nav.categories')}
            </Link>
            <Link href="/deals" className="px-4 py-2 bg-[#ff6b35] text-white rounded font-bold hover:bg-[#ff7b45] transition">
              {t('nav.deals')}
            </Link>
            <Link href="/new-releases" className="text-gray-300 hover:text-[#ff6b35] transition font-medium">
              {t('nav.newReleases')}
            </Link>
            <a
              href="https://hupiesim.com"
              target="_blank"
              rel="noopener noreferrer"
              title={t('nav.esimTitle')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500/20 hover:border-emerald-400 transition"
            >
              {t('nav.esim')}
            </a>
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-4">
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault()
                const q = searchQuery.trim()
                if (q.length >= 2) {
                  searchTouchedRef.current = true
                  router.push(`/search?q=${encodeURIComponent(q)}`)
                }
              }}
            >
              <input 
                type="search" 
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  searchTouchedRef.current = true
                  setSearchQuery(e.target.value)
                }}
                aria-label={t('nav.searchPlaceholder')}
                className="bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg w-64 focus:border-[#ff6b35] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('nav.clearSearch')}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </form>

            <LanguageSwitcher />

            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className="px-3 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition font-medium flex items-center gap-2"
              >
                <span className="text-lg">{selectedCurrency.symbol}</span>
                <span className="text-sm">{selectedCurrency.code.toUpperCase()}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isCurrencyOpen && (
                <div className="absolute end-0 mt-2 w-48 bg-[#1a1d24] border border-gray-700 rounded-lg shadow-xl z-50">
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => {
                        setSelectedCurrency(currency)
                        setIsCurrencyOpen(false)
                      }}
                      className={`w-full text-start px-4 py-2 hover:bg-[#ff6b35] hover:text-white transition flex items-center justify-between ${
                        selectedCurrency.code === currency.code ? 'bg-[#ff6b35]/20 text-[#ff6b35]' : 'text-gray-300'
                      } ${currency.code === currencies[0].code ? 'rounded-t-lg' : ''} ${
                        currency.code === currencies[currencies.length - 1].code ? 'rounded-b-lg' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{currency.symbol}</span>
                        <span className="font-medium">{currency.code.toUpperCase()}</span>
                      </span>
                      {selectedCurrency.code === currency.code && (
                        <span className="text-green-500">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a
              href="https://hupiesim.com"
              target="_blank"
              rel="noopener noreferrer"
              title={t('nav.esimTitle')}
              className="inline-flex lg:hidden items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition"
            >
              {t('nav.esim')}
            </a>

            <Link href="/cart" className="relative text-gray-300 hover:text-[#ff6b35] transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#ff6b35] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </Link>
            {customer ? (
              <div className="relative group">
                <button className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {customer.first_name}
                </button>
                <div className="absolute end-0 mt-2 w-48 bg-[#1a1d24] border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link href="/account" className="block px-4 py-2 text-gray-300 hover:bg-[#ff6b35] hover:text-white rounded-t-lg transition">
                    {t('nav.myAccount')}
                  </Link>
                  <Link href="/account/orders" className="block px-4 py-2 text-gray-300 hover:bg-[#ff6b35] hover:text-white transition">
                    {t('nav.myOrders')}
                  </Link>
                  <Link href="/account/keys" className="block px-4 py-2 text-gray-300 hover:bg-[#ff6b35] hover:text-white transition">
                    {t('nav.myKeys')}
                  </Link>
                  <button onClick={handleLogout} className="w-full text-start px-4 py-2 text-red-400 hover:bg-red-500 hover:text-white rounded-b-lg transition">
                    {t('nav.logout')}
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition font-medium">
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Tablet Only Hamburger Button (md to lg) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={t('nav.menuLabel')}
            aria-expanded={isMenuOpen}
            className="hidden md:block lg:hidden text-white p-2 hover:text-[#ff6b35] transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Mobile Right Actions: Cart, Login (compact icon), Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-1">
            <Link
              href="/cart"
              aria-label={t('nav.cart')}
              className="relative p-2 text-gray-300 hover:text-[#ff6b35] transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Login / Profile (Kısaltılmış temiz kullanıcı ikonu) */}
            <Link
              href={customer ? '/account' : '/login'}
              aria-label={customer ? (customer.first_name || t('nav.myAccount')) : t('nav.login')}
              title={customer ? (customer.first_name || t('nav.myAccount')) : t('nav.login')}
              className="p-2 text-gray-300 hover:text-[#ff6b35] transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={t('nav.menuLabel')}
              aria-expanded={isMenuOpen}
              className="text-white p-2 hover:text-[#ff6b35] transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-800 pt-4 space-y-4">
            {/* Dil ve Para Birimi Seçimi (Mobilde menü içinde şık görünüm) */}
            <div className="bg-[#1a1d24] border border-gray-800 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {t('nav.currencyLabel') || 'Tercihler / Settings'}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] text-gray-400 mb-1">{t('nav.language') || 'Dil'}</div>
                  <LanguageSwitcher />
                </div>
                <div>
                  <div className="text-[11px] text-gray-400 mb-1">{t('nav.currency') || 'Para Birimi'}</div>
                  <select
                    value={selectedCurrency.code}
                    onChange={(e) => {
                      const next = currencies.find((c) => c.code === e.target.value)
                      if (next) setSelectedCurrency(next)
                    }}
                    aria-label={t('nav.currencyLabel')}
                    className="w-full px-3 py-2 bg-[#15171c] border border-gray-700 text-white rounded-lg text-sm font-semibold focus:border-[#ff6b35] focus:outline-none"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Arama Çubuğu (Mobilde hızlı arama) */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const q = searchQuery.trim()
                if (q.length >= 2) {
                  searchTouchedRef.current = true
                  setIsMenuOpen(false)
                  router.push(`/search?q=${encodeURIComponent(q)}`)
                }
              }}
              className="relative"
            >
              <input
                type="search"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => {
                  searchTouchedRef.current = true
                  setSearchQuery(e.target.value)
                }}
                className="w-full bg-[#1a1d24] border border-gray-700 text-white px-4 py-2.5 rounded-lg text-sm focus:border-[#ff6b35] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            {/* Navigasyon Linkleri */}
            <div className="space-y-1">
              <Link
                href="/products"
                className="flex items-center justify-between py-2.5 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d24] transition font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{t('nav.allGames')}</span>
                <span className="text-gray-600">›</span>
              </Link>
              <Link
                href="/categories"
                className="flex items-center justify-between py-2.5 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d24] transition font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>{t('nav.categories')}</span>
                <span className="text-gray-600">›</span>
              </Link>
              <Link
                href="/deals"
                className="flex items-center justify-between py-2.5 px-3 rounded-lg text-[#ff6b35] font-bold bg-[#ff6b35]/10 border border-[#ff6b35]/20 hover:bg-[#ff6b35]/20 transition"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>🔥 {t('nav.deals')}</span>
                <span className="text-[#ff6b35]">›</span>
              </Link>
              <Link
                href="/new-releases"
                className="flex items-center justify-between py-2.5 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d24] transition font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <span>✨ {t('nav.newReleases')}</span>
                <span className="text-gray-600">›</span>
              </Link>
              <a
                href="https://hupiesim.com"
                target="_blank"
                rel="noopener noreferrer"
                title={t('nav.esimTitle')}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500/20 transition"
              >
                <span>🌐 {t('nav.esim')}</span>
                <span className="text-xs text-emerald-300/80">hupiesim.com ↗</span>
              </a>
              <Link
                href="/cart"
                className="flex items-center justify-between py-2.5 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d24] transition font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <span>🛒</span>
                  <span>{t('nav.cart')}</span>
                </span>
                {cartItemCount > 0 && (
                  <span className="bg-[#ff6b35] text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Kullanıcı / Hesap / Giriş Yap */}
            <div className="pt-2 border-t border-gray-800">
              {customer ? (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">
                    👤 {customer.first_name} {customer.last_name || ''}
                  </div>
                  <Link
                    href="/account"
                    className="block py-2 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d24]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.myAccount')}
                  </Link>
                  <Link
                    href="/account/orders"
                    className="block py-2 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d24]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.myOrders')}
                  </Link>
                  <Link
                    href="/account/keys"
                    className="block py-2 px-3 rounded-lg text-gray-300 hover:text-white hover:bg-[#1a1d24]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.myKeys')}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="w-full text-start py-2 px-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                  >
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    href="/login"
                    className="text-center py-2.5 px-4 bg-[#1a1d24] border border-gray-700 text-white rounded-lg font-bold hover:border-[#ff6b35] transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    href="/register"
                    className="text-center py-2.5 px-4 bg-[#ff6b35] text-white rounded-lg font-bold hover:bg-[#ff7b45] transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.register') || 'Kayıt Ol'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
