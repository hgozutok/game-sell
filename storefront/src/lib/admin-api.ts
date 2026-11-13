import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

export const ADMIN_TOKEN_KEY = 'admin_token'
export const ADMIN_EMAIL_KEY = 'admin_email'

// Create admin API client
export const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

function isBrowser() {
  return typeof window !== 'undefined'
}

export function getAdminToken(): string | null {
  if (!isBrowser()) return null
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  // Eski surumde btoa() ile uretilen sahte token'lar JWT degil; gondermeyelim.
  return token && token.split('.').length === 3 ? token : null
}

// Request interceptor: gercek Medusa JWT'sini ekle
adminApi.interceptors.request.use(
  (config) => {
    const token = getAdminToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: oturum dusunce login'e don
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401 && isBrowser() && window.location.pathname.startsWith('/admin/dashboard')) {
      localStorage.removeItem(ADMIN_TOKEN_KEY)
      localStorage.removeItem(ADMIN_EMAIL_KEY)
      localStorage.removeItem('admin_authenticated')
      window.location.href = '/admin'
    }
    return Promise.reject(error)
  }
)

/** Medusa admin kullanicisi ile giris yapar ve JWT'yi saklar. */
export async function adminLogin(email: string, password: string): Promise<string> {
  const res = await axios.post(
    `${API_URL}/auth/user/emailpass`,
    { email, password },
    { headers: { 'Content-Type': 'application/json' } }
  )

  const token = res.data?.token
  if (!token) {
    throw new Error('Giris yanitinda token bulunamadi')
  }

  localStorage.setItem(ADMIN_TOKEN_KEY, token)
  localStorage.setItem(ADMIN_EMAIL_KEY, email)
  localStorage.setItem('admin_authenticated', 'true')
  return token
}

export function adminLogout() {
  if (!isBrowser()) return
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_EMAIL_KEY)
  localStorage.removeItem('admin_authenticated')
}

export function getAdminEmail(): string | null {
  if (!isBrowser()) return null
  return localStorage.getItem(ADMIN_EMAIL_KEY)
}

/** Token'in hala gecerli oldugunu backend'e sorar. */
export async function verifyAdminSession(): Promise<boolean> {
  if (!getAdminToken()) return false
  try {
    await adminApi.get('/admin/users/me')
    return true
  } catch {
    return false
  }
}

export default adminApi
