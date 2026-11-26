'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authService, Customer } from '@/lib/auth'
import { prefsFromCustomer } from '@/lib/prefs'
import { useCurrencyStore } from '@/store/currencyStore'
import { useWishlistStore } from '@/store/wishlistStore'

interface AuthContextType {
  customer: Customer | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshCustomer: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshCustomer = async () => {
    if (authService.isAuthenticated()) {
      const customerData = await authService.getCurrentCustomer()
      setCustomer(customerData)
      if (!customerData) return

      // Hesaptaki kayitli tercihleri uygula (kur, dil, wishlist)
      const prefs = prefsFromCustomer(customerData)
      if (prefs.currency) {
        const store = useCurrencyStore.getState()
        const target = store.currencies.find((c) => c.code === prefs.currency)
        if (target && store.selectedCurrency.code !== target.code) {
          store.setSelectedCurrency(target)
        }
      }
      if (Array.isArray(prefs.wishlist) && prefs.wishlist.length) {
        const wl = useWishlistStore.getState()
        const merged = [...new Set([...prefs.wishlist, ...wl.productIds])]
        if (merged.length !== wl.productIds.length) {
          wl.setIds(merged)
        }
      }
      if (prefs.locale) {
        try {
          localStorage.setItem('NEXT_LOCALE', prefs.locale)
          document.cookie = `NEXT_LOCALE=${prefs.locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
        } catch {}
      }
    } else {
      await authService.logout()
      setCustomer(null)
    }
  }

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        await refreshCustomer()
      } catch (error) {
        console.error('Failed to load customer:', error)
        setCustomer(null)
      } finally {
        setLoading(false)
      }
    }

    loadCustomer()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password)
    setCustomer(response.customer)
    // guest tercihlerini yeni hesaba tasi
    await refreshCustomer()
  }

  const logout = async () => {
    await authService.logout()
    setCustomer(null)
  }

  const value = {
    customer,
    loading,
    isAuthenticated: !!customer,
    login,
    logout,
    refreshCustomer,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
