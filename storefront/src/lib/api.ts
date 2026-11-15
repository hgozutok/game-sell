import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    ...(PUBLISHABLE_KEY && { "x-publishable-api-key": PUBLISHABLE_KEY }),
  },
  withCredentials: true,
})

// Backend'e giden isteklerde tarayici dilini iletir.
// E-posta sablonlari ve kayit/dogrulama mesajlari bu dile gore secilir.
function getClientEmailLocale(): string {
  if (typeof window === "undefined") return "en"
  try {
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)
    const raw =
      match?.[1] ||
      window.localStorage.getItem("NEXT_LOCALE") ||
      navigator.language ||
      "en"
    const base = decodeURIComponent(raw).toLowerCase().split(/[-_]/)[0]
    return ["en", "tr", "de", "fr", "ar"].includes(base) ? base : "en"
  } catch {
    return "en"
  }
}

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("medusa_auth_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    config.headers["Accept-Language"] = getClientEmailLocale()
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("medusa_auth_token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export default api

