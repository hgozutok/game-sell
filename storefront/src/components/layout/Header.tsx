'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false)
  const [cartItemCount, setCartItemCount] = useState(0)
  const getTotalItems = useCartStore((state) => state.getTotalItems)
  const { customer, logout } = useAuth()
  const { selectedCurrency, currencies, setSelectedCurrency, loadCurrencyRates } = useCurrencyStore()
  
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

  const handleLogout = async () => {
    await logout()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-[#15171c] border-b border-gray-800 sticky top-0 z-50">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white text-center py-2 text-sm font-semibold">
        🔥 FLASH SALE: UP TO 80% OFF - LIMITED TIME ONLY! 🔥
      </div>
      
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg">
              🎮
            </div>
            <div>
              <div className="text-xl font-bold text-white">DIGITAL KEYS</div>
              <div className="text-xs text-gray-400">INSTANT DELIVERY</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            <Link href="/products" className="text-gray-300 hover:text-[#ff6b35] transition font-medium">
              ALL GAMES
            </Link>
            <Link href="/categories" className="text-gray-300 hover:text-[#ff6b35] transition font-medium">
              CATEGORIES
            </Link>
            <Link href="/deals" className="px-4 py-2 bg-[#ff6b35] text-white rounded font-bold hover:bg-[#ff7b45] transition">
              DEALS 🔥
            </Link>
            <Link href="/new-releases" className="text-gray-300 hover:text-[#ff6b35] transition font-medium">
              NEW RELEASES
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <input 
                type="search" 
                placeholder="Search games..." 
                className="bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg w-64 focus:border-[#ff6b35] focus:outline-none"
              />
            </div>

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
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1d24] border border-gray-700 rounded-lg shadow-xl z-50">
                  {currencies.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => {
                        setSelectedCurrency(currency)
                        setIsCurrencyOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-[#ff6b35] hover:text-white transition flex items-center justify-between ${
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
                <div className="absolute right-0 mt-2 w-48 bg-[#1a1d24] border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <Link href="/account" className="block px-4 py-2 text-gray-300 hover:bg-[#ff6b35] hover:text-white rounded-t-lg transition">
                    My Account
                  </Link>
                  <Link href="/account/orders" className="block px-4 py-2 text-gray-300 hover:bg-[#ff6b35] hover:text-white transition">
                    My Orders
                  </Link>
                  <Link href="/account/keys" className="block px-4 py-2 text-gray-300 hover:bg-[#ff6b35] hover:text-white transition">
                    My Keys
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500 hover:text-white rounded-b-lg transition">
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition font-medium">
                LOGIN
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden text-white p-2"
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

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-800 pt-4 space-y-2">
            <Link href="/products" className="block py-2 text-gray-300 hover:text-[#ff6b35]" onClick={() => setIsMenuOpen(false)}>
              ALL GAMES
            </Link>
            <Link href="/categories" className="block py-2 text-gray-300 hover:text-[#ff6b35]" onClick={() => setIsMenuOpen(false)}>
              CATEGORIES
            </Link>
            <Link href="/deals" className="block py-2 text-[#ff6b35] font-bold" onClick={() => setIsMenuOpen(false)}>
              DEALS 🔥
            </Link>
            <Link href="/cart" className="block py-2 text-gray-300 hover:text-[#ff6b35]" onClick={() => setIsMenuOpen(false)}>
              CART
            </Link>
            {customer ? (
              <>
                <Link href="/account" className="block py-2 text-gray-300 hover:text-[#ff6b35]" onClick={() => setIsMenuOpen(false)}>
                  MY ACCOUNT
                </Link>
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="block w-full text-left py-2 text-red-400 hover:text-red-300">
                  LOGOUT
                </button>
              </>
            ) : (
              <Link href="/login" className="block py-2 text-gray-300 hover:text-[#ff6b35]" onClick={() => setIsMenuOpen(false)}>
                LOGIN
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
