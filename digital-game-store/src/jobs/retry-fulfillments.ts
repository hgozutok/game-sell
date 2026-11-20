import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { fulfillKinguinOrderWorkflow } from "../workflows/fulfill-kinguin-order"

/**
 * retrying durumundaki siparisleri yeniden dener (exponential olmayan sabit aralik;
 * gercek backoff deneme sayisiyla artan bekleme ile simule edilir).
 * Max denemeden sonra failed -> admin manuel kuyrugunda gorunur.
 *
 * Ayrica: bakiye-topup bekleyen siparisleri (awaiting_approval +
 * metadata.topup_needed_eur) izler — Kinguin bakiyesi siparis maliyetini
 * karsilayacak kadar yukseldiginde fulfillment'i otomatik tamamlar.
 */
export default async function retryFulfillmentsJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const orderModule = container.resolve(Modules.ORDER) as any
  const kinguin = container.resolve("kinguin") as any
  const max = Number(process.env.FULFILL_MAX_RETRIES || 4)

  const orders = await orderModule.listOrders({
    metadata: { fulfillment_state: ["retrying"] },
  })

  let retried = 0
  let failed = 0

  for (const order of orders || []) {
    const attempts = Number(order.metadata?.fulfillment_attempts || 0)
    if (attempts >= max) {
      await orderModule.updateOrders([
        {
          id: order.id,
          metadata: { ...order.metadata, fulfillment_state: "failed" },
        },
      ])
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
      await orderModule.updateOrders([
        {
          id: order.id,
          metadata: { ...order.metadata, fulfillment_attempts: attempts + 1 },
        },
      ])
    } catch (e: any) {
      const code = e?.code || e?.details?.code
      // Kuyruk guard'lari (readonly, zarar, bakiye, TAH SILAT): tekrar deneme
      // sayacini tuketme — workflow awaiting_approval yazdi, koru.
      const queueGuard =
        code === "READONLY" ||
        code === "NEGATIVE_MARGIN" ||
        code === "BALANCE" ||
        code === "ORDER_LIMIT" ||
        code === "PAYMENT_NOT_CAPTURED" ||
        e?.name === "KinguinOrderModeError" ||
        e?.name === "KinguinInsufficientBalanceError"

      if (queueGuard) {
        await orderModule
          .updateOrders([
            {
              id: order.id,
              metadata: {
                ...order.metadata,
                fulfillment_state: "awaiting_approval",
                fulfillment_error: String(e?.message || e),
                fulfillment_updated_at: new Date().toISOString(),
              },
            },
          ])
          .catch(() => null)
        continue
      }

      const newAttempts = attempts + 1
      await orderModule.updateOrders([
        {
          id: order.id,
          metadata: {
            ...order.metadata,
            fulfillment_attempts: newAttempts,
            fulfillment_state: newAttempts >= max ? "failed" : "retrying",
            fulfillment_error: String(e?.message || e),
            fulfillment_updated_at: new Date().toISOString(),
          },
        },
      ])
    }
  }

  // --- Bakiye top-up bekleyen siparisler: bakiye yeterli olursa otomatik tamamla ---
  let topupCompleted = 0
  let topupWaiting = 0
  try {
    // Metadata $gt operatoru guvenilir degil — state ile cek, bellekte suz
    const queued = await orderModule.listOrders({
      metadata: { fulfillment_state: "awaiting_approval" },
    })
    const waiting = (queued || []).filter(
      (o: any) => Number(o.metadata?.topup_needed_eur || 0) > 0
    )
    if (waiting?.length) {
      let balance = 0
      try {
        balance = (await kinguin.getBalance()).balance
      } catch {
        logger.warn("[retry-fulfillments] bakiye sorgulanamadi — topup kontrolu atlandi")
      }

      for (const order of waiting || []) {
        const needed = Number(order.metadata?.topup_needed_eur || 0)
        const cost = Number(order.metadata?.order_provider_cost_eur || 0)
        const minBal = Number(
          (await kinguin.getSettings().then((s: any) => s.min_balance).catch(() => 10)) || 10
        )
        if (balance >= cost + minBal && balance >= needed) {
          logger.info(
            `[retry-fulfillments] ${order.id}: bakiye yeterli oldu (${balance} EUR >= ${cost} + ${minBal}) — fulfillment otomatik denenecek`
          )
          try {
            await fulfillKinguinOrderWorkflow(container).run({
              input: { orderId: order.id, customerId: order.customer_id, email: order.email },
            })
            await orderModule.updateOrders([
              {
                id: order.id,
                metadata: {
                  ...order.metadata,
                  topup_needed_eur: null,
                  topup_completed_at: new Date().toISOString(),
                },
              },
            ])
            topupCompleted++
          } catch (e: any) {
            // workflow kendi guard'larini tekrar uygular (hala yetersizse kuyruga geri duser)
            topupWaiting++
          }
        } else {
          topupWaiting++
        }
      }
    }
  } catch (e: any) {
    logger.warn(`[retry-fulfillments] topup kontrolu hatasi: ${e?.message}`)
  }

  if (retried || failed || topupCompleted || topupWaiting) {
    logger.info(
      `[retry-fulfillments] retried=${retried} failed=${failed} topupCompleted=${topupCompleted} topupWaiting=${topupWaiting}`
    )
  }
  return { retried, failed, topupCompleted, topupWaiting }
}

export const config = {
  name: "retry-fulfillments",
  schedule: "*/10 * * * *",
}
