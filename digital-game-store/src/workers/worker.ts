import { Queue, Worker } from "bullmq"
import Redis from "ioredis"
import type KeyInventoryService from "../modules/key-inventory/service"
import { sendTemplateEmail, buildTableHtml, escapeHtmlValue } from "../utils/email"

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
    const orderModule = container.resolve("order") as any

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

    // Send email with keys (admin panel SMTP ayarlari)
    try {
      const order = await orderModule.retrieveOrder(orderId).catch(() => null)
      const email = order?.email
      if (email) {
        const keysHtml = buildTableHtml(
          keys.map((key: any) => ({
            title: escapeHtmlValue(key.product_title || key.product_id || "Dijital anahtar"),
            code: `<code style="font-family:monospace;background:#f3f4f6;padding:3px 7px;border-radius:4px;">${escapeHtmlValue(
              key.key_code || key.code || ""
            )}</code>`,
          })),
          [
            { key: "title", label: "Ürün" },
            { key: "code", label: "Anahtar" },
          ]
        )
        await sendTemplateEmail(container, {
          to: email,
          templateKey: "order-digital-keys",
          data: {
            customer_name: String(email).split("@")[0] || "Değerli Müşteri",
            order_number: order?.display_id ? String(order.display_id) : orderId,
            keys_html: keysHtml,
          },
        })
      }
    } catch (emailError: any) {
      console.warn(`[worker] e-posta gonderilemedi: ${emailError?.message}`)
    }

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

