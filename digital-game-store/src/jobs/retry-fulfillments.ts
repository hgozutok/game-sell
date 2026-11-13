import { MedusaContainer } from "@medusajs/framework/types"
import { fulfillKinguinOrderWorkflow } from "../workflows/fulfill-kinguin-order"

/**
 * retrying durumundaki siparisleri yeniden dener (exponential olmayan sabit aralik;
 * gercek backoff deneme sayisiyla artan bekleme ile simule edilir).
 * Max denemeden sonra failed -> admin manuel kuyrugunda gorunur.
 */
export default async function retryFulfillmentsJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const orderModule = container.resolve("order") as any
  const max = Number(process.env.FULFILL_MAX_RETRIES || 4)

  const orders = await orderModule.listOrders({
    metadata: { fulfillment_state: ["retrying"] },
  })

  let retried = 0
  let failed = 0

  for (const order of orders || []) {
    const attempts = Number(order.metadata?.fulfillment_attempts || 0)
    if (attempts >= max) {
      await orderModule.updateOrder(order.id, {
        metadata: { ...order.metadata, fulfillment_state: "failed" },
      })
      failed++
      continue
    }
    // Exponential bekleme: attempts * 10 dk'dan kisa ise henuz deneme
    const lastAt = new Date(order.metadata?.fulfillment_updated_at || 0).getTime()
    const backoffMin = Math.min(60, Math.pow(2, attempts) * 5)
    if (Date.now() - lastAt < backoffMin * 60000) continue

    retried++
    try {
      await fulfillKinguinOrderWorkflow(container).run({
        input: { orderId: order.id, customerId: order.customer_id, email: order.email },
      })
      await orderModule.updateOrder(order.id, {
        metadata: { ...order.metadata, fulfillment_attempts: attempts + 1 },
      })
    } catch (e: any) {
      const newAttempts = attempts + 1
      await orderModule.updateOrder(order.id, {
        metadata: {
          ...order.metadata,
          fulfillment_attempts: newAttempts,
          fulfillment_state: newAttempts >= max ? "failed" : "retrying",
          fulfillment_error: String(e?.message || e),
          fulfillment_updated_at: new Date().toISOString(),
        },
      })
    }
  }

  if (retried || failed) {
    logger.info(`[retry-fulfillments] retried=${retried} failed=${failed}`)
  }
  return { retried, failed }
}

export const config = {
  name: "retry-fulfillments",
  schedule: "*/10 * * * *",
}
