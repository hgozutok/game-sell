import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { Modules } from "@medusajs/framework/utils"
import { fulfillKinguinOrderWorkflow } from "../workflows/fulfill-kinguin-order"

/**
 * order.placed — odenen dijital siparisleri fulfillment kuyruguna alir.
 *
 * Karar agaci (kinguin_settings):
 *   auto_fulfill_enabled=false -> metadata.fulfillment_state=awaiting_approval (manuel kuyruk)
 *   order_mode=readonly        -> awaiting_provider_mode (para guvenligi; admin onayi ile canliya gecer)
 *   auto_fulfill_enabled=true + live -> fulfill-kinguin-order workflow'u
 *
 * Workflow hatalari -> fulfillment_state=retrying (retry-fulfillments job'u yeniden dener,
 * max denemeden sonra failed). Zarar/bakiye guard'lari workflow icinde vardir.
 */
export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger") as any
  const orderId = event.data?.id
  logger.info(`[order-placed] event alindi: id=${orderId}`)
  if (!orderId) {
    logger.warn(`[order-placed] event.data.id yok: ${JSON.stringify(event.data || {}).slice(0, 200)}`)
    return
  }

  const orderModule = container.resolve(Modules.ORDER) as any
  const kinguin = container.resolve("kinguin") as any

  // 2.11: retrieveOrder dot-relations ile cokuyor — ayri sorgularla urun bilgisi al
  const order = await orderModule.retrieveOrder(orderId).catch((e: any) => {
    logger.warn(`[order-placed] siparis cekilemedi: ${e?.message}`)
    return null
  })
  if (!order) {
    logger.warn(`[order-placed] siparis bulunamadi: ${orderId}`)
    return
  }

  let lineItems: any[] = []
  try {
    const orderWithItems = await orderModule.retrieveOrder(orderId, { relations: ["items"] })
    lineItems = orderWithItems.items || []
  } catch {
    lineItems = []
  }
  const productModule = container.resolve(Modules.PRODUCT) as any
  logger.info(
    `[order-placed] items via retrieveOrder=${lineItems.length} ilkKeys=${lineItems[0] ? Object.keys(lineItems[0]).slice(0, 10).join(",") : "-"}`
  )

  // Dijital mi? (provider metadata, KINGUIN SKU veya is_digital)
  const digitalItems: any[] = []
  for (const item of lineItems || []) {
    let isDigital = false
    let productMeta: any = null
    if (item.product_id) {
      const prod = await productModule.retrieveProduct(item.product_id).catch(() => null)
      productMeta = prod?.metadata || null
      if (prod?.metadata?.is_digital === true || prod?.metadata?.provider === "kinguin") {
        isDigital = true
      }
    }
    const sku = item.variant_sku || ""
    if (sku.startsWith("KINGUIN-")) isDigital = true
    if (isDigital) {
      digitalItems.push({ ...item, sku, product_metadata: productMeta })
    }
  }
  logger.info(
    `[order-placed] lineItems=${(lineItems || []).length} ilkKeys=${(lineItems || [])[0] ? Object.keys(lineItems[0]).slice(0, 12).join(",") : "-"} dijital=${digitalItems.length}`
  )
  if (digitalItems.length === 0) return

  const settings = await kinguin.getSettings()

  const setState = async (state: string, extra: Record<string, any> = {}) => {
    await orderModule.updateOrders([
      {
        id: orderId,
        metadata: {
          ...(order.metadata || {}),
          fulfillment_state: state,
          fulfillment_updated_at: new Date().toISOString(),
          ...extra,
        },
      },
    ])
  }

  // 0) Ödeme onayı olmadan otomatik teslimat yok
  const paidStatuses = ['captured', 'partially_captured']
  const paymentApproved =
    order.metadata?.payment_approved === true ||
    paidStatuses.includes(String(order.payment_status))

  if (!paymentApproved) {
    await setState('awaiting_approval', { fulfillment_error: 'Ödeme onayı bekleniyor' })
    logger.info(`[order-placed] ${orderId}: ödeme onayı yok — manuel kuyruğa alındı`)
    return
  }

  // 0b) Sipariş onayı olmadan da otomatik teslimat yok
  if (order.metadata?.order_approved !== true) {
    await setState('awaiting_approval', { fulfillment_error: 'Sipariş onayı bekleniyor' })
    logger.info(`[order-placed] ${orderId}: sipariş onayı yok — manuel kuyruğa alındı`)
    return
  }

  // 1) Manuel onay modu
  if (settings.auto_fulfill_enabled === false) {
    await setState("awaiting_approval", { fulfillment_error: null })
    logger.info(`[order-placed] ${orderId}: manuel onay kuyruguna alindi`)
    return
  }

  // 2) Para guvenligi: readonly modda otomatik Kinguin siparisi yok
  if (settings.order_mode !== "live") {
    await setState("awaiting_provider_mode", {
      fulfillment_error: "order_mode=readonly — canli siparis icin admin onayi gerekli",
    })
    logger.info(`[order-placed] ${orderId}: readonly mod — onay kuyrugu`)
    return
  }

  // 3) Otomatik fulfillment
  await setState("pending_fulfillment", { fulfillment_error: null })
  try {
    await fulfillKinguinOrderWorkflow(container).run({
      input: { orderId, customerId: order.customer_id, email: order.email },
    })
    logger.info(`[order-placed] ${orderId}: fulfillment workflow tamamlandi`)
  } catch (e: any) {
    logger.warn(`[order-placed] ${orderId} fulfillment hatasi: ${e?.message}`)
    const fresh = await orderModule.retrieveOrder(orderId).catch(() => null)
    const attempts = Number(fresh?.metadata?.fulfillment_attempts || 0) + 1
    const max = Number(process.env.FULFILL_MAX_RETRIES || 4)
    const code = e?.code || e?.details?.code
    // readonly/zarar/bakiye guard'lari tekrar denemeyi gereksiz kilar — dogrudan kuyruk
    const manual =
      code === "READONLY" || code === "NEGATIVE_MARGIN" || code === "BALANCE" ||
      e?.name === "KinguinOrderModeError" || e?.name === "KinguinInsufficientBalanceError"
    await orderModule.updateOrders([
      {
        id: orderId,
        metadata: {
          ...(fresh?.metadata || {}),
          fulfillment_state: manual ? "awaiting_approval" : attempts >= max ? "failed" : "retrying",
        fulfillment_attempts: attempts,
        fulfillment_error: String(e?.message || e),
          fulfillment_updated_at: new Date().toISOString(),
        },
      },
    ])
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
