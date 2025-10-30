import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

// Create admin API client
export const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor to add admin token
adminApi.interceptors.request.use(
  (config) => {
    const adminToken = typeof window !== 'undefined' 
      ? localStorage.getItem('admin_token') 
      : null
    
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Always reject on 401 but don't auto-logout for development
    // TODO: Configure proper authentication in production
    return Promise.reject(error)
  }
)

export default adminApi

