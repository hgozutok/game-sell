import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import type KeyInventoryService from "../modules/key-inventory/service"

interface FulfillDigitalOrderInput {
  orderId: string
  customerId: string
  email?: string
  items: Array<{
    productId: string
    variantId?: string
    quantity: number
    lineItemId: string
  }>
}

const fetchKeysFromInventoryStep = createStep(
  "fetch-keys-from-inventory",
  async (input: FulfillDigitalOrderInput, { container }) => {
    const keyInventoryService = container.resolve("keyInventory") as KeyInventoryService
    const fetchedKeys: any[] = []

    for (const item of input.items) {
      for (let i = 0; i < item.quantity; i++) {
        const key = await keyInventoryService.getAvailableKey(
          item.productId,
          item.variantId
        )

        if (key) {
          const assignedKey = await keyInventoryService.assignKeyToOrder(
            key.id,
            input.orderId,
            input.customerId
          )
          fetchedKeys.push({
            ...assignedKey,
            lineItemId: item.lineItemId,
          })
        }
      }
    }

    return new StepResponse({ keys: fetchedKeys }, { keyIds: fetchedKeys.map(k => k.id) })
  },
  async (compensateInput, { container }) => {
    // Rollback: unassign keys if workflow fails
    const keyInventoryService = container.resolve("keyInventory") as KeyInventoryService
    
    for (const keyId of compensateInput.keyIds) {
      await keyInventoryService.updateDigitalKeys([{
        id: keyId,
        status: "available",
        order_id: null,
        customer_id: null,
        assigned_at: null,
      }])
    }
  }
)

const fetchKeysFromProviderStep = createStep(
  "fetch-keys-from-provider",
  async (input: { orderId: string; customerId: string; missingItems: any[] }, { container }) => {
    const keyInventoryService = container.resolve("keyInventory") as KeyInventoryService
    const codesWholesaleService = container.resolve("codesWholesale") as any
    const kinguinService = container.resolve("kinguin") as any
    const logger = container.resolve("logger") as any

    const fetchedKeys: any[] = []

    for (const item of input.missingItems) {
      // Try CodesWholesale first
      try {
        const keyData = await codesWholesaleService.fetchKey(item.sku)
        
        // Store key in inventory
        const [newKey] = await keyInventoryService.createDigitalKeys([{
          key_code: keyData.code,
          product_id: item.productId,
          variant_id: item.variantId,
          provider: "codesWholesale",
          sku: item.sku,
          status: "assigned",
          order_id: input.orderId,
          customer_id: input.customerId,
          platform: keyData.platform,
          region: keyData.region,
          assigned_at: new Date(),
        }])

        fetchedKeys.push(newKey)
        continue
      } catch (error: any) {
        logger.warn(`CodesWholesale fetch failed for ${item.sku}: ${error.message}`)
      }

      // Fallback to Kinguin
      try {
        const keyData = await kinguinService.fetchKey(item.kinguinId)
        
        const [newKey] = await keyInventoryService.createDigitalKeys([{
          key_code: keyData.code,
          product_id: item.productId,
          variant_id: item.variantId,
          provider: "kinguin",
          sku: item.kinguinId,
          status: "assigned",
          order_id: input.orderId,
          customer_id: input.customerId,
          platform: keyData.platform,
          region: keyData.region,
          assigned_at: new Date(),
        }])

        fetchedKeys.push(newKey)
      } catch (error: any) {
        logger.error(`Both providers failed for product ${item.productId}: ${error.message}`)
        throw new Error(`Unable to fulfill key for product ${item.productId}`)
      }
    }

    return new StepResponse({ keys: fetchedKeys })
  }
)

const sendKeyDeliveryEmailStep = createStep(
  "send-key-delivery-email",
  async (input: { orderId: string; customerId: string; email?: string; keys: any[] }, { container }) => {
    const notificationService = container.resolve(Modules.NOTIFICATION) as any
    const keyInventoryService = container.resolve("keyInventory") as KeyInventoryService
    const orderModuleService = container.resolve(Modules.ORDER) as any
    const logger = container.resolve("logger") as any

    const order = await orderModuleService
      .retrieveOrder(input.orderId)
      .catch(() => null)
    const email = input.email || order?.email

    // Bildirim gonderimi teslimati bloklamaz — key teslimi her durumda tamamlanir.
    try {
      if (email) {
        if (typeof notificationService?.createNotifications === "function") {
          await notificationService.createNotifications({
            to: email,
            channel: "email",
            template: "order-digital-keys",
            data: {
              order_id: input.orderId,
              keys: input.keys,
            },
          })
        } else if (typeof notificationService?.send === "function") {
          await notificationService.send({
            to: email,
            channel: "email",
            template: "order-digital-keys",
            data: {
              order_id: input.orderId,
              keys: input.keys,
            },
          })
        } else {
          logger?.warn?.("Notification module has no send/createNotifications; email skipped.")
        }
      }
    } catch (e: any) {
      logger?.warn?.(`Key delivery email failed for order ${input.orderId}: ${e?.message}`)
    }

    // Mark keys as delivered
    for (const key of input.keys) {
      await keyInventoryService.markKeyAsDelivered(key.id)
    }

    // Siparis metadata'sini koruyarak teslimati isaretle
    try {
      const metadata = {
        ...(order?.metadata || {}),
        digital_fulfilled: true,
        digital_fulfilled_at: new Date().toISOString(),
        fulfillment_state: "fulfilled",
      }
      await orderModuleService.updateOrders([{ id: input.orderId, metadata }])
    } catch (e: any) {
      logger?.warn?.(`Failed to mark order ${input.orderId} fulfilled: ${e?.message}`)
    }

    return new StepResponse({ success: true })
  }
)

export const fulfillDigitalOrderWorkflow = createWorkflow(
  "fulfill-digital-order",
  (input: FulfillDigitalOrderInput) => {
    // Step 1: Try to fetch keys from existing inventory
    const inventoryResult = fetchKeysFromInventoryStep(input)

    // Step 2: Check if we need to fetch more keys from providers
    const missingItems = transform({ input, inventoryResult }, (data) => {
      const fetchedCount = data.inventoryResult.keys.length
      const totalNeeded = data.input.items.reduce((sum, item) => sum + item.quantity, 0)
      
      if (fetchedCount < totalNeeded) {
        // Calculate which items are still missing
        return data.input.items.filter((item: any) => {
          const fetchedForItem = data.inventoryResult.keys.filter(
            (k: any) => k.product_id === item.productId
          ).length
          return fetchedForItem < item.quantity
        })
      }
      return []
    })

    // Step 3: Fetch missing keys from external providers
    const providerResult = fetchKeysFromProviderStep({
      orderId: input.orderId,
      customerId: input.customerId,
      missingItems,
    })

    // Step 4: Combine all keys and send delivery email
    const allKeys = transform({ inventoryResult, providerResult }, (data) => {
      return [...data.inventoryResult.keys, ...(data.providerResult.keys || [])]
    })

    const emailResult = sendKeyDeliveryEmailStep({
      orderId: input.orderId,
      customerId: input.customerId,
      email: input.email,
      keys: allKeys,
    })

    return new WorkflowResponse({
      success: true,
      keys: allKeys,
    })
  }
)

