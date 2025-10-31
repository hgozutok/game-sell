import { MedusaService } from "@medusajs/framework/utils"
import { DigitalKey } from "./models/digital-key"

class KeyInventoryService extends MedusaService({
  DigitalKey,
}) {
  async getAvailableKey(productId: string, variantId?: string): Promise<any> {
    const queryOptions: any = {
      product_id: productId,
      status: "available",
    }
    
    if (variantId) {
      queryOptions.variant_id = variantId
    }

    const keys = await this.listDigitalKeys(queryOptions, { take: 1 })
    
    return keys.length > 0 ? keys[0] : null
  }

  async assignKeyToOrder(keyId: string, orderId: string, customerId: string): Promise<any> {
    const [key] = await this.updateDigitalKeys([{
      id: keyId,
      status: "assigned",
      order_id: orderId,
      customer_id: customerId,
      assigned_at: new Date(),
    }])
    
    return key
  }

  async markKeyAsDelivered(keyId: string): Promise<any> {
    const [key] = await this.updateDigitalKeys([{
      id: keyId,
      status: "delivered",
      delivered_at: new Date(),
    }])
    
    return key
  }

  async revokeKey(keyId: string): Promise<any> {
    const [key] = await this.updateDigitalKeys([{
      id: keyId,
      status: "revoked",
      revoked_at: new Date(),
    }])
    
    return key
  }

  async getKeysByOrder(orderId: string): Promise<any[]> {
    return await this.listDigitalKeys({ order_id: orderId })
  }

  async getKeysByCustomer(customerId: string): Promise<any[]> {
    return await this.listDigitalKeys({ customer_id: customerId })
  }

  async getInventoryCount(productId: string, variantId?: string): Promise<number> {
    const queryOptions: any = {
      product_id: productId,
      status: "available",
    }
    
    if (variantId) {
      queryOptions.variant_id = variantId
    }

    const keys = await this.listDigitalKeys(queryOptions)
    return keys.length
  }

  async bulkImportKeys(keys: Array<{
    key_code: string
    product_id: string
    variant_id?: string
    provider?: "codesWholesale" | "kinguin" | "manual"
    sku?: string
    platform?: string
    region?: string
    metadata?: any
  }>): Promise<any[]> {
    return await this.createDigitalKeys(keys)
  }
}

export default KeyInventoryService

