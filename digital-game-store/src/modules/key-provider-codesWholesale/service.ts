import { MedusaService } from "@medusajs/framework/utils"
import axios, { AxiosInstance } from "axios"

interface CodesWholesaleKey {
  code: string
  platform: string
  region: string
}

interface CodesWholesaleProduct {
  productId: string
  name: string
  quantity: number
  price: number
  platform?: string
  region?: string
  images?: Array<{ format: string; image: string }>
  languages?: string[]
  badges?: Array<{ id: number; name: string; slug: string }>
  description?: string
  detailedImages?: string[]
}

class CodesWholesaleService extends MedusaService({}) {
  private client: AxiosInstance
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor(container: any, options: any) {
    super(container, options)
    
    // CodesWholesale API (supports v2 and v3)
    this.client = axios.create({
      baseURL: process.env.CODESWHOLESALE_API_URL || "https://api.codeswholesale.com",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    })
  }

  private async authenticate(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    const clientId = process.env.CODESWHOLESALE_CLIENT_ID
    const clientSecret = process.env.CODESWHOLESALE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error("CodesWholesale credentials not configured")
    }

    try {
      // CodesWholesale OAuth 2.0 - client credentials flow
      const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      
      const response = await axios.post(
        "https://api.codeswholesale.com/oauth/token",
        "grant_type=client_credentials",
        {
          headers: {
            "Authorization": `Basic ${authString}`,
            "Content-Type": "application/x-www-form-urlencoded",
          }
        }
      )

      this.accessToken = response.data.access_token
      // Set expiry to 5 minutes before actual expiry
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000)
      
      return this.accessToken
    } catch (error: any) {
      console.error('CodesWholesale auth error:', error.response?.data || error.message)
      throw new Error(`CodesWholesale authentication failed: ${error.response?.data?.error || error.message}`)
    }
  }

  async fetchKey(productSku: string): Promise<CodesWholesaleKey> {
    const token = await this.authenticate()

    try {
      const response = await this.client.post(
        `/v2/orders`,
        {
          products: [{ productId: productSku, quantity: 1 }],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const orderResponse = response.data
      const keyCode = orderResponse.keys[0].code

      return {
        code: keyCode,
        platform: orderResponse.keys[0].platform || "Unknown",
        region: orderResponse.keys[0].region || "GLOBAL",
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch key from CodesWholesale: ${error.message}`)
    }
  }

  async checkAvailability(productSku: string): Promise<boolean> {
    const token = await this.authenticate()

    try {
      const response = await this.client.get(`/v2/products/${productSku}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      return response.data.quantity > 0
    } catch (error: any) {
      return false
    }
  }

  async getProductInfo(productSku: string): Promise<CodesWholesaleProduct | null> {
    const token = await this.authenticate()

    try {
      // CodesWholesale v2 API - Get specific product
      const response = await this.client.get(`/v2/products/${productSku}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      const product = response.data

      return {
        productId: product.productId || product.identifier,
        name: product.name,
        quantity: product.quantity || 0,
        price: product.prices?.[0]?.value || 0, // First price tier value
        platform: product.platform || 'PC',
        region: product.regions?.[0] || product.regionDescription || 'GLOBAL',
      }
    } catch (error: any) {
      console.error('CWS getProductInfo error:', error.response?.data || error.message)
      return null
    }
  }

  async searchProducts(query: string): Promise<CodesWholesaleProduct[]> {
    const token = await this.authenticate()

    try {
      // CodesWholesale v2 API - Search products
      const response = await this.client.get(`/v2/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          phrase: query, // Search phrase
          inStockDaysAgo: 7,
          limit: 20,
        },
      })

      // CodesWholesale API v2 Response: { "items": [...] }
      const products = response.data.items || []

      return products.map((product: any) => {
        const productId = product.productId || product.identifier
        const imageUrl = `https://api.codeswholesale.com/v1/products/${productId}/image?format=MEDIUM`
        
        return {
          productId: productId,
          name: product.name,
          quantity: product.quantity || 0,
          price: product.prices?.[0]?.value || 0,
          // Include image for search results
          images: [{
            format: 'MEDIUM',
            image: imageUrl
          }],
          detailedImages: [imageUrl],
        }
      })
    } catch (error: any) {
      console.error('CWS searchProducts error:', error.response?.data || error.message)
      return []
    }
  }

  async listAllProducts(limit: number = 100): Promise<CodesWholesaleProduct[]> {
    const token = await this.authenticate()

    try {
      console.log('🔍 CWS: Fetching products with params:', {
        inStockDaysAgo: 7,
        limit: limit,
        offset: 0,
      })

      // CodesWholesale v2 API - Products endpoint
      const response = await this.client.get(`/v2/products`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        params: {
          inStockDaysAgo: 7, // Products in stock in last 7 days
          limit: limit,
          offset: 0,
          order: 'bestseller', // Most popular first
        },
      })

      console.log('📦 CWS API Response:', {
        status: response.status,
        hasItems: !!response.data.items,
        itemCount: response.data.items?.length || 0,
        hasContinuationToken: !!response.data.continuationToken,
      })

      // CodesWholesale API v2 Response Format:
      // { "continuationToken": "...", "items": [...] }
      const products = response.data.items || []

      console.log(`✅ CWS: Found ${products.length} products`)

      if (products.length === 0) {
        console.warn('⚠️ CWS: No products in response')
        return []
      }

      return products.map((product: any) => {
        const productId = product.productId || product.identifier
        const imageUrl = `https://api.codeswholesale.com/v1/products/${productId}/image?format=MEDIUM`
        
        return {
          productId: productId,
          name: product.name,
          quantity: product.quantity || 0,
          price: product.prices?.[0]?.value || 0, // First price tier value
          platform: product.platform || 'PC',
          region: product.regions?.[0] || product.regionDescription || 'GLOBAL',
          // Use direct MEDIUM format image URL
          images: [{
            format: 'MEDIUM',
            image: imageUrl
          }],
          // Also provide direct image URLs for import
          detailedImages: [
            imageUrl,
            `https://api.codeswholesale.com/v1/products/${productId}/image?format=LARGE`,
            `https://api.codeswholesale.com/v1/products/${productId}/image?format=SMALL`,
          ],
          languages: product.languages || [],
          badges: product.badges || [],
        }
      })
    } catch (error: any) {
      console.error('❌ CWS listAllProducts error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
      return []
    }
  }

  async getProductImages(productId: string): Promise<string[]> {
    // CodesWholesale v1 Image API - Direct image URL
    // No API call needed, just construct the URL
    // MEDIUM is best for product cards, LARGE for detail pages
    const baseUrl = 'https://api.codeswholesale.com/v1/products'
    
    return [
      `${baseUrl}/${productId}/image?format=MEDIUM`,  // Primary (best for cards)
      `${baseUrl}/${productId}/image?format=LARGE`,   // Detail page
      `${baseUrl}/${productId}/image?format=SMALL`,   // Fallback
    ]
  }

  async getProductDescription(productId: string): Promise<string | null> {
    const token = await this.authenticate()

    try {
      // CodesWholesale v3 API - Product Description
      const response = await this.client.get(`/v3/products/${productId}/description`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      return response.data.description || response.data.text || null
    } catch (error: any) {
      // Description not available for all products - this is normal
      // Return null silently
      return null
    }
  }

  async getFullProductInfo(productId: string): Promise<CodesWholesaleProduct | null> {
    try {
      // Get basic product info
      const productInfo = await this.getProductInfo(productId)
      if (!productInfo) return null

      // Fetch additional details in parallel
      const [images, description] = await Promise.all([
        this.getProductImages(productId),
        this.getProductDescription(productId),
      ])

      return {
        ...productInfo,
        detailedImages: images,
        description: description || undefined,
      }
    } catch (error: any) {
      console.error('CWS getFullProductInfo error:', error.message)
      return null
    }
  }
}

export default CodesWholesaleService

