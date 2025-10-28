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
  // Customer login using custom endpoint
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post('/store/auth/login', {
        email,
        password,
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
        }
      }
      
      return { customer, token }
    } catch (error: any) {
      console.error('Auth error:', error)
      throw new Error(error.response?.data?.message || error.message || 'Invalid email or password')
    }
  },

  // Customer registration
  async register(data: {
    email: string
    password: string
    first_name: string
    last_name: string
    phone?: string
  }): Promise<Customer> {
    try {
      const response = await api.post('/store/auth/register', {
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      })
      
      const customer = response.data.customer
      
      // Auto-login after registration
      if (customer) {
        localStorage.setItem('customer_id', customer.id)
        localStorage.setItem('customer_email', customer.email)
        localStorage.setItem('customer_first_name', customer.first_name || '')
        localStorage.setItem('customer_last_name', customer.last_name || '')
      }
      
      return customer
    } catch (error: any) {
      console.error('Registration error:', error)
      throw new Error(error.response?.data?.message || error.message || 'Registration failed')
    }
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

  // Get current customer
  async getCurrentCustomer(): Promise<Customer | null> {
    try {
      const customerId = localStorage.getItem('customer_id')
      const customerEmail = localStorage.getItem('customer_email')
      const firstName = localStorage.getItem('customer_first_name')
      const lastName = localStorage.getItem('customer_last_name')
      
      if (!customerId || !customerEmail) return null
      
      // Return customer data from localStorage
      // In production, you would validate the session with backend
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

