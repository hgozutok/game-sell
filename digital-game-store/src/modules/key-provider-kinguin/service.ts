import { MedusaService } from "@medusajs/framework/utils"
import axios, { AxiosInstance } from "axios"

interface KinguinKey {
  code: string
  platform: string
  region: string
}

interface KinguinProduct {
  productId: string
  name: string
  qty: number
  price: number
  platform?: string
  region?: string
}

class KinguinService extends MedusaService({}) {
  private client: AxiosInstance

  constructor(container: any, options: any) {
    super(container, options)
    
    const apiKey = process.env.KINGUIN_API_KEY

    if (!apiKey) {
      throw new Error("Kinguin API key not configured")
    }

    // Kinguin Gateway API
    this.client = axios.create({
      baseURL: process.env.KINGUIN_API_URL || "https://gateway.kinguin.net/esa/api/v1",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Api-Key": apiKey,
      },
    })
  }

  async fetchKey(productId: string): Promise<KinguinKey> {
    try {
      const response = await this.client.post(`/order/keys`, {
        products: [
          {
            kinguinId: productId,
            qty: 1,
          },
        ],
      })

      const key = response.data.keys[0]

      return {
        code: key.serial,
        platform: key.type || "Unknown",
        region: key.region || "GLOBAL",
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch key from Kinguin: ${error.message}`)
    }
  }

  async checkAvailability(productId: string): Promise<boolean> {
    try {
      const response = await this.client.get(`/products/${productId}`)
      return response.data.qty > 0
    } catch (error: any) {
      return false
    }
  }

  async getProductInfo(productId: string): Promise<KinguinProduct | null> {
    try {
      // Kinguin API - Get product details
      const response = await this.client.get(`/products/${productId}`)

      const product = response.data

      return {
        productId: product.kinguinId || product.productId,
        name: product.name || product.title,
        qty: product.qty || 1,
        price: product.price?.value || product.price || 0,
        platform: product.platform || 'Steam',
        region: product.regionId || 'GLOBAL',
      }
    } catch (error: any) {
      console.error('Kinguin getProductInfo error:', error.response?.data || error.message)
      return null
    }
  }

  async searchProducts(query: string): Promise<KinguinProduct[]> {
    try {
      // Kinguin API - Search products
      const response = await this.client.get(`/products`, {
        params: { 
          name: query,
          limit: 20,
          page: 1,
          activePreorder: false,
        },
      })

      const products = response.data.results || []

      return products.map((product: any) => ({
        productId: product.kinguinId || product.productId,
        name: product.name || product.title,
        qty: product.qty || 1,
        price: product.price?.value || product.price || 0,
      }))
    } catch (error: any) {
      console.error('Kinguin searchProducts error:', error.response?.data || error.message)
      return []
    }
  }

  async listAllProducts(limit: number = 100): Promise<KinguinProduct[]> {
    try {
      // Kinguin API - List products
      const response = await this.client.get(`/products`, {
        params: {
          limit: limit,
          page: 1,
          sortBy: 'bestsellers', // Most popular products
          activePreorder: false, // Only available products
        },
      })

      const products = response.data.results || []

      return products.map((product: any) => ({
        productId: product.kinguinId || product.productId,
        name: product.name || product.title,
        qty: product.qty || 1,
        price: product.price?.value || product.price || 0,
        platform: product.platform || 'Steam',
        region: product.regionId || 'GLOBAL',
      }))
    } catch (error: any) {
      console.error('Kinguin listAllProducts error:', error.response?.data || error.message)
      return []
    }
  }
}

export default KinguinService

