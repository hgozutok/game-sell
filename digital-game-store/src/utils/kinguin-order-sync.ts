/**
 * Kinguin siparis durumu senkronu — webhook icin de ortak mantik.
 * - pending/processing siparislerin durumunu Kinguin'den ceker
 * - completed: key'leri indirir, AES-256-GCM ile sifreli saklar
 * - canceled: failed olarak isaretler
 */
import { encryptKeys } from "./key-crypto"

type AnyService = any

export interface OrderSyncSummary {
  processed: number
  completed: number
  keysFetched: number
  canceled: number
  refunded: number
  errors: string[]
}

async function getServices(container: any) {
  const scope = container.scope ?? container
  return {
    kinguin: scope.resolve("kinguin") as AnyService,
    logger: scope.resolve("logger") as AnyService,
  }
}

/** Tek bir kinguin_order kaydini uzaktan senkronize eder; key'leri sifreli saklar. */
export async function syncOneKinguinOrder(
  container: any,
  orderRow: any
): Promise<{ status: string; keysFetched: number }> {
  const { kinguin } = await getServices(container)
  const remote = await kinguin.getRemoteOrder(orderRow.order_id)
  const remoteStatus = String(remote.status || "processing").toLowerCase()

  if (remoteStatus === "completed") {
    const keys = await kinguin.getOrderKeys(orderRow.order_id)
    if (keys.length > 0) {
      const encrypted = encryptKeys(keys)
      await kinguin.updateLocalOrderStatus(orderRow.order_id, {
        status: "completed",
        keys_encrypted: JSON.parse(encrypted),
        keys_delivered_at: new Date(),
        error: null,
      })

      // Medusa siparisine bagliysa ve henuz teslim edilmediyse teslim workflow'unu tetikle
      if (orderRow.medusa_order_id) {
        await maybeDeliverLinkedOrder(container, orderRow.medusa_order_id)
      }
      return { status: "completed", keysFetched: keys.length }
    }
    // completed ama key henuz yok — processing say
    await kinguin.updateLocalOrderStatus(orderRow.order_id, { status: "processing" })
    return { status: "processing", keysFetched: 0 }
  }

  if (remoteStatus === "canceled" || remoteStatus === "cancelled") {
    await kinguin.updateLocalOrderStatus(orderRow.order_id, { status: "canceled" })
    return { status: "canceled", keysFetched: 0 }
  }

  // ESA guide §8: key'ler iade edildiginde siparis refunded olur —
  // teslimat tetiklenmez, medusa siparisi manuel kuyruga alinir.
  if (remoteStatus === "refunded") {
    await kinguin.updateLocalOrderStatus(orderRow.order_id, {
      status: "refunded",
      error: "Kinguin siparisi refunded — key'ler iade edildi, bakiye geri verildi",
    })
    if (orderRow.medusa_order_id) {
      await pauseLinkedOrderForRefund(container, orderRow.medusa_order_id)
    }
    return { status: "refunded", keysFetched: 0 }
  }

  await kinguin.updateLocalOrderStatus(orderRow.order_id, {
    status: remoteStatus === "completed" ? "completed" : "processing",
  })
  return { status: remoteStatus, keysFetched: 0 }
}

/** refunded Kinguin siparisinin medusa karsiligini manuel kuyruga alir. */
async function pauseLinkedOrderForRefund(
  container: any,
  medusaOrderId: string
): Promise<void> {
  const scope = container.scope ?? container
  const orderModule = scope.resolve("order") as any
  const logger = scope.resolve("logger") as any
  const order = await orderModule.retrieveOrder(medusaOrderId).catch(() => null)
  if (!order) return
  const state = (order.metadata as any)?.fulfillment_state
  if (state === "delivered") return // key'ler musteriye gitmis — manuel inceleme
  try {
    await orderModule.updateOrders([
      {
        id: medusaOrderId,
        metadata: {
          ...(order.metadata || {}),
          fulfillment_state: "awaiting_approval",
          fulfillment_error:
            "Kinguin siparisi iade edildi (refunded) — farkli saglayici veya iade sureci gerekli",
          fulfillment_updated_at: new Date().toISOString(),
        },
      },
    ])
  } catch (e: any) {
    logger.warn(`[kinguin-order-sync] refunded ${medusaOrderId}: ${e?.message}`)
  }
}

/**
 * Medusa siparisi delivered degilse deliver-kinguin-keys workflow'unu calistirir.
 * Webhook ve sync job'u ortak kullanir.
 */
export async function maybeDeliverLinkedOrder(
  container: any,
  medusaOrderId: string
): Promise<boolean> {
  const scope = container.scope ?? container
  const orderModule = scope.resolve("order") as any
  const logger = scope.resolve("logger") as any

  const order = await orderModule.retrieveOrder(medusaOrderId).catch(() => null)
  if (!order) return false
  const state = (order.metadata as any)?.fulfillment_state
  if (state === "delivered") return false

  try {
    const { deliverKinguinKeysWorkflow } = await import(
      "../workflows/fulfill-kinguin-order.js"
    )
    await deliverKinguinKeysWorkflow(container).run({
      input: { orderId: medusaOrderId, customerId: order.customer_id, email: order.email },
    })
    return true
  } catch (e: any) {
    logger.warn(`[kinguin-order-sync] teslimat hatasi (${medusaOrderId}): ${e?.message}`)
    return false
  }
}

/** Tum bekleyen siparisleri gez (job + admin retry kullanir). */
export async function syncPendingKinguinOrders(
  container: any
): Promise<OrderSyncSummary> {
  const { kinguin, logger } = await getServices(container)
  const summary: OrderSyncSummary = {
    processed: 0,
    completed: 0,
    keysFetched: 0,
    canceled: 0,
    refunded: 0,
    errors: [],
  }

  const pending = await kinguin.listKinguinOrders({})
  const active = (pending || []).filter(
    (o: any) => o.status === "pending" || o.status === "processing"
  )

  for (const orderRow of active) {
    summary.processed++
    try {
      const result = await syncOneKinguinOrder(container, orderRow)
      if (result.status === "completed") {
        summary.completed++
        summary.keysFetched += result.keysFetched
      } else if (result.status === "canceled") {
        summary.canceled++
      } else if (result.status === "refunded") {
        summary.refunded++
      }
    } catch (e: any) {
      summary.errors.push(`${orderRow.order_id}: ${e?.message}`)
      logger.warn(`[kinguin-order-sync] ${orderRow.order_id}: ${e?.message}`)
    }
  }

  return summary
}
