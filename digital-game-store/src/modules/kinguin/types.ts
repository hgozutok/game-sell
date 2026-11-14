// Kinguin ESA API hata siniflandirmasi
export class KinguinError extends Error {
  status?: number
  code?: string
  details?: any

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message)
    this.name = "KinguinError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export class KinguinAuthError extends KinguinError {
  constructor(message = "Kinguin: invalid authentication data") {
    super(message, 401, "Authorization")
    this.name = "KinguinAuthError"
  }
}

export class KinguinRateLimitError extends KinguinError {
  retryAfterMs?: number

  constructor(retryAfterMs?: number) {
    super("Kinguin: rate limit exceeded", 429, "RateLimit")
    this.name = "KinguinRateLimitError"
    this.retryAfterMs = retryAfterMs
  }
}

export class KinguinNotFoundError extends KinguinError {
  constructor(resource: string) {
    super(`Kinguin: ${resource} not found`, 404, "NotFound")
    this.name = "KinguinNotFoundError"
  }
}

export class KinguinInsufficientBalanceError extends KinguinError {
  constructor(message = "Kinguin: insufficient balance") {
    super(message, 400, "InsufficientBalance")
    this.name = "KinguinInsufficientBalanceError"
  }
}

export class KinguinProductUnavailableError extends KinguinError {
  constructor(message = "Kinguin: product unavailable") {
    super(message, 400, "ProductUnavailable")
    this.name = "KinguinProductUnavailableError"
  }
}

// readonly modda siparis olusturma denendiginde
export class KinguinOrderModeError extends KinguinError {
  constructor(message = "Kinguin: order mode is readonly — live ordering is disabled") {
    super(message, 403, "OrderModeReadonly")
    this.name = "KinguinOrderModeError"
  }
}

// ESA guide §14: hicbir key iade kriterlerine uymuyor (hepsi claim edilmis veya 24h gecti)
export class KinguinNoKeysToReturnError extends KinguinError {
  constructor(message = "Kinguin: no keys eligible for return") {
    super(message, 422, "NoKeysToReturn")
    this.name = "KinguinNoKeysToReturnError"
  }
}

// ===================== Tip tanimlari =====================

// GET /v1/products satiri (ESA API)
export interface KinguinApiProduct {
  kinguinId: number | string
  productId?: string
  name?: string
  originalName?: string
  qty?: number
  textQty?: number
  totalQty?: number
  price?: number | string
  platform?: string
  regionId?: number
  regionalLimitations?: string
  genre?: string
  genres?: string[]
  tags?: string[]
  images?: { cover?: { url?: string; thumbnail?: string }; screenshots?: { url?: string; thumbnail?: string }[] }
  isPreorder?: boolean
  hasText?: boolean
  releaseDate?: string
  ageRating?: number | string
  updatedAt?: string
  [key: string]: any
}

// Mağaza icinde normalize edilmis sekli
export interface KinguinProductData {
  kinguinId: string
  productId: string | null
  name: string
  originalName: string | null
  platform: string | null
  genre: string | null
  regionId: number | null
  regionLimitations: string | null
  qty: number
  textQty: number
  price: number
  currency: string
  images: { cover?: string; screenshots?: string[] }
  genres: string[]
  tags: string[]
  isPreorder: boolean
  hasText: boolean
  releaseDate: string | null
  ageRating: number | null
  raw: KinguinApiProduct
}

export interface KinguinApiOrderProduct {
  kinguinId?: number | string
  productId?: string
  qty?: number
  price?: number
  name?: string
  keys?: KinguinApiKey[]
}

export interface KinguinApiOrder {
  orderId: string
  orderExternalId?: string
  status: string
  totalPrice?: number | string
  currency?: string
  totalQty?: number
  products?: KinguinApiOrderProduct[]
}

export interface KinguinApiKey {
  id: string | number
  serial: string // text key veya base64 gorsel
  type: string // text/plain, image/jpeg, image/png, image/gif
  name?: string
  kinguinId?: number | string
  offerId?: string
  productId?: string
}

export interface CreateOrderItem {
  productId: string
  qty: number
  price: number // birim fiyat (saglayici para birimi)
}
