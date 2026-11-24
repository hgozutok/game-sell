import { api } from './api'
import { medusaClient } from './medusa-client'

export interface Customer {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  has_account: boolean
  created_at: string
  updated_at: string
  metadata?: any
}

export interface AuthResponse {
  customer: Customer
  token?: string
}

export const authService = {
  // Customer login — donen token gercek Medusa JWT'sidir; medusa_auth_token olarak
  // saklanir (api interceptor Authorization: Bearer ile gonderir) ve /store/* route'lari
  // bu token ile gercek kimlik dogrulamasi yapar.
  async login(email: string, password: string, captchaToken?: string | null): Promise<AuthResponse> {
    try {
      const response = await api.post('/store/auth/login', {
        email,
        password,
        captcha_token: captchaToken || undefined,
      })

      const customer = response.data.customer
      const token = response.data.token

      if (customer) {
        localStorage.setItem('customer_id', customer.id)
        localStorage.setItem('customer_email', customer.email)
        localStorage.setItem('customer_first_name', customer.first_name || '')
        localStorage.setItem('customer_last_name', customer.last_name || '')
        if (token) {
          localStorage.setItem('customer_token', token)
          localStorage.setItem('medusa_auth_token', token)
        }
      }

      return { customer, token }
    } catch (error: any) {
      console.error('Auth error:', error)
      const err: any = new Error(
        error.response?.data?.message || error.message || 'Invalid email or password'
      )
      err.code = error.response?.data?.code
      err.email = error.response?.data?.email
      throw err
    }
  },

  // Kayit — e-posta dogrulamasi aciksa token donmez; kullanici e-postasindaki
  // baglantiyla hesabini dogruladiktan sonra giris yapabilir.
  async register(
    data: {
      email: string
      password: string
      first_name: string
      last_name: string
      phone?: string
    },
    captchaToken?: string | null
  ): Promise<{ customer: Customer | null; requiresVerification: boolean }> {
    try {
      const response = await api.post('/store/auth/register', {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        captcha_token: captchaToken || undefined,
      })

      const customer = response.data.customer
      const requiresVerification = response.data.requires_verification === true

      if (customer && !requiresVerification) {
        localStorage.setItem('customer_id', customer.id)
        localStorage.setItem('customer_email', customer.email)
        localStorage.setItem('customer_first_name', customer.first_name || '')
        localStorage.setItem('customer_last_name', customer.last_name || '')
      }

      return { customer, requiresVerification }
    } catch (error: any) {
      console.error('Registration error:', error)
      throw new Error(error.response?.data?.message || error.message || 'Registration failed')
    }
  },

  // E-posta dogrulama akisi
  async verifyEmail(token: string): Promise<void> {
    await api.post('/store/auth/verify-email', { token })
  },

  async resendVerification(email: string): Promise<void> {
    await api.post('/store/auth/resend-verification', { email })
  },

  // Sifremi unuttum / sifre sifirlama akisi
  async forgotPassword(email: string, captchaToken?: string | null): Promise<{ message: string }> {
    const response = await api.post('/store/auth/forgot-password', {
      email,
      captcha_token: captchaToken || undefined,
    })
    return response.data
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await api.post('/store/auth/reset-password', {
      token,
      password,
    })
    return response.data
  },

  // Sosyal giris saglayici + bot korumasi konfigurasyonu (admin ayarlarindan gelir)
  async getSocialProviders(): Promise<Array<{ provider: string; enabled: boolean }>> {
    const config = await this.getAuthProvidersConfig()
    return config.providers
  },

  async getAuthProvidersConfig(): Promise<{
    providers: Array<{ provider: string; enabled: boolean }>
    captcha: { provider: string; site_key: string | null }
  }> {
    try {
      const response = await api.get('/store/auth/providers')
      return {
        providers: response.data?.providers || [],
        captcha: response.data?.captcha || { provider: 'none', site_key: null },
      }
    } catch {
      return { providers: [], captcha: { provider: 'none', site_key: null } }
    }
  },

  // Sosyal callback sayfasi JWT'yi burada saklar
  saveSocialSession(token: string): void {
    localStorage.setItem('medusa_auth_token', token)
    localStorage.setItem('customer_token', token)
  },

  // Logout
  async logout(): Promise<void> {
    try {
      // Medusa v2 might not have a logout endpoint for customers
      // Just clear local storage
      localStorage.removeItem('customer_id')
      localStorage.removeItem('customer_email')
      localStorage.removeItem('customer_first_name')
      localStorage.removeItem('customer_last_name')
      localStorage.removeItem('customer_token')
      localStorage.removeItem('medusa_auth_token')
    } catch (error) {
      console.error('Logout error:', error)
    }
  },

  // Get current customer — backend'den taze veri (metadata dahil); JWT gecersizse
  // lokal aynaya dusulur.
  async getCurrentCustomer(): Promise<Customer | null> {
    try {
      const token = localStorage.getItem('medusa_auth_token')
      if (token) {
        try {
          const response = await api.get('/store/customers/me')
          const c = response.data?.customer
          if (c) {
            localStorage.setItem('customer_id', c.id)
            localStorage.setItem('customer_email', c.email)
            localStorage.setItem('customer_first_name', c.first_name || '')
            localStorage.setItem('customer_last_name', c.last_name || '')
            return c as Customer
          }
        } catch {
          /* backend erisilemedi — lokal aynaya dus */
        }
      }

      const customerId = localStorage.getItem('customer_id')
      const customerEmail = localStorage.getItem('customer_email')
      const firstName = localStorage.getItem('customer_first_name')
      const lastName = localStorage.getItem('customer_last_name')

      if (!customerId || !customerEmail) return null

      return {
        id: customerId,
        email: customerEmail,
        first_name: firstName || '',
        last_name: lastName || '',
        has_account: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Customer
    } catch (error) {
      console.error('Failed to get customer:', error)
      // Clear invalid session
      localStorage.removeItem('customer_id')
      localStorage.removeItem('customer_email')
      localStorage.removeItem('customer_first_name')
      localStorage.removeItem('customer_last_name')
      localStorage.removeItem('customer_token')
      return null
    }
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('customer_id')
  },

  // Get customer ID from storage
  getCustomerId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('customer_id')
  },
}

// Admin authentication
export const adminAuthService = {
  async login(email: string, password: string): Promise<any> {
    const response = await api.post('/admin/auth', { email, password })
    
    if (response.data.user) {
      localStorage.setItem('admin_token', response.data.token)
      localStorage.setItem('admin_email', response.data.user.email)
    }
    
    return response.data
  },

  async logout(): Promise<void> {
    try {
      await api.delete('/admin/auth')
    } catch (error) {
      console.error('Admin logout error:', error)
    } finally {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_email')
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('admin_token')
  },
}

