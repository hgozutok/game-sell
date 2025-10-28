import { Queue, Worker } from "bullmq"
import Redis from "ioredis"
import type KeyInventoryService from "../modules/key-inventory/service"

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
})

// Key Fulfillment Queue
export const keyFulfillmentQueue = new Queue("key-fulfillment", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // 7 days
    },
  },
})

// Key Fulfillment Worker
const keyFulfillmentWorker = new Worker(
  "key-fulfillment",
  async (job) => {
    const { orderId, customerId, productId, variantId, quantity } = job.data

    console.log(`Processing key fulfillment for order ${orderId}`)

    // Import container and services
    const { container } = await import("@medusajs/framework")
    const keyInventoryService = container.resolve("keyInventory") as KeyInventoryService
    const codesWholesaleService = container.resolve("codesWholesale") as any
    const kinguinService = container.resolve("kinguin") as any
    const notificationService = container.resolve("notification") as any

    const keys: any[] = []

    for (let i = 0; i < quantity; i++) {
      // Try to get key from inventory
      let key = await keyInventoryService.getAvailableKey(productId, variantId)

      if (key) {
        key = await keyInventoryService.assignKeyToOrder(key.id, orderId, customerId)
        keys.push(key)
        continue
      }

      // Fetch from external provider
      try {
        // Try CodesWholesale first
        const keyData = await codesWholesaleService.fetchKey(productId)
        
        const [newKey] = await keyInventoryService.createDigitalKeys([{
          key_code: keyData.code,
          product_id: productId,
          variant_id: variantId,
          provider: "codesWholesale",
          status: "assigned",
          order_id: orderId,
          customer_id: customerId,
          platform: keyData.platform,
          region: keyData.region,
          assigned_at: new Date(),
        }])

        keys.push(newKey)
      } catch (error) {
        // Fallback to Kinguin
        const keyData = await kinguinService.fetchKey(productId)
        
        const [newKey] = await keyInventoryService.createDigitalKeys([{
          key_code: keyData.code,
          product_id: productId,
          variant_id: variantId,
          provider: "kinguin",
          status: "assigned",
          order_id: orderId,
          customer_id: customerId,
          platform: keyData.platform,
          region: keyData.region,
          assigned_at: new Date(),
        }])

        keys.push(newKey)
      }
    }

    // Send email with keys
    await notificationService.send({
      to: customerId,
      channel: "email",
      template: "order-digital-keys",
      data: {
        order_id: orderId,
        keys,
      },
    })

    // Mark keys as delivered
    for (const key of keys) {
      await keyInventoryService.markKeyAsDelivered(key.id)
    }

    return { success: true, keys: keys.length }
  },
  {
    connection,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000,
    },
  }
)

keyFulfillmentWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`)
})

keyFulfillmentWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err)
})

// Key Sync Worker - syncs inventory levels with providers
const keySyncQueue = new Queue("key-sync", { connection })

const keySyncWorker = new Worker(
  "key-sync",
  async (job) => {
    const { productId, sku } = job.data

    console.log(`Syncing key inventory for product ${productId}`)

    const { container } = await import("@medusajs/framework")
    const keyInventoryService = container.resolve("keyInventory") as KeyInventoryService
    const codesWholesaleService = container.resolve("codesWholesale") as any

    // Check current inventory
    const currentCount = await keyInventoryService.getInventoryCount(productId)

    // Check provider availability
    const productInfo = await codesWholesaleService.getProductInfo(sku)

    console.log(`Product ${productId}: ${currentCount} keys in inventory, ${productInfo?.quantity || 0} available from provider`)

    return { currentCount, providerCount: productInfo?.quantity || 0 }
  },
  {
    connection,
    concurrency: 5,
  }
)

console.log("✅ BullMQ workers started:")
console.log("  - key-fulfillment (concurrency: 10)")
console.log("  - key-sync (concurrency: 5)")

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing workers...")
  await keyFulfillmentWorker.close()
  await keySyncWorker.close()
  await connection.quit()
  process.exit(0)
})

