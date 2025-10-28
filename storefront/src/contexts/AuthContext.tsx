'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authService, Customer } from '@/lib/auth'

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
    } else {
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

