import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework/subscribers"
import { Modules } from "@medusajs/framework/utils"
import { fulfillKinguinOrderWorkflow } from "../workflows/fulfill-kinguin-order"
import {
  sendTemplateEmail,
  buildTableHtml,
  escapeHtmlValue,
  emailUiText,
  resolveEmailLocale,
} from "../utils/email"
import { evaluatePurchaseVelocity } from "../utils/velocity-guard"
import { convertOrderTotalToCurrency } from "../utils/currency"

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

  // Sipariş onayı e-postası — alicinin dilinde; SMTP yoksa akışı bloklamaz
  if (order.email) {
    try {
      const locale = await resolveEmailLocale(container, {
        locale: order.metadata?.locale || order.metadata?.language,
        customerId: order.customer_id,
        email: order.email,
      })
      const ui = emailUiText(locale)
      const itemsHtml = buildTableHtml(
        (lineItems || []).map((item: any) => ({
          title: escapeHtmlValue(item.title || item.product_title || ui.product),
          quantity: escapeHtmlValue(item.quantity || 1),
          total: escapeHtmlValue(
            `${(Number(item.total || 0) / 100).toFixed(2)} ${String(
              order.currency_code || ""
            ).toUpperCase()}`
          ),
        })),
        [
          { key: "title", label: ui.product },
          { key: "quantity", label: ui.quantity, align: "right" },
          { key: "total", label: ui.total, align: "right" },
        ]
      )

      await sendTemplateEmail(container, {
        to: order.email,
        templateKey: "order-confirmation",
        locale,
        customerId: order.customer_id,
        data: {
          customer_name:
            order.billing_address?.first_name ||
            String(order.email).split("@")[0] ||
            ui.customer,
          order_number: order.display_id ? String(order.display_id) : order.id,
          items_html: itemsHtml,
          total: `${(Number(order.total || 0) / 100).toFixed(2)} ${String(
            order.currency_code || ""
          ).toUpperCase()}`,
          currency: String(order.currency_code || "").toUpperCase(),
        },
      })
    } catch (e: any) {
      logger.warn(`[order-placed] onay e-postasi gonderilemedi: ${e?.message}`)
    }
  }

  const settings = await kinguin.getSettings()
  const storeSettings = container.resolve("storeSettings") as any
  // Hizli satin alma guard'i once kos: esik asilirsa auto_fulfillment_enabled
  // burada kapanir ve asagidaki okuma manuel modu gorur.
  const velocity = await evaluatePurchaseVelocity(container, logger)
  const autoFulfillEnabled =
    (await storeSettings
      .getSettingValue("orders.auto_fulfillment_enabled", false)
      .catch(() => false)) === true

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

  // -1) Alarm tetiklendiyse bu siparis de manuel kuyruga duser
  if (velocity.triggered) {
    await setState("awaiting_approval", {
      fulfillment_error: "Hizli satin alma alarmi — otomatik teslimat manuel moda alindi",
      velocity_guard_triggered: true,
    })
    logger.warn(
      `[order-placed] ${orderId}: hiz alarmi (${velocity.count}/${velocity.maxOrders} siparis, ${velocity.windowMinutes}dk) — manuel kuyruk`
    )
    return
  }

  // -0.5) Tutar esigi: siparis tutari esigi (EUR) uzerindeyse otomatik
  // teslimat kapanir, admin onayina dusar. 0/esik yok = kontrol kapali.
  const maxTotalEur = Number(
    (await storeSettings
      .getSettingValue("orders.auto_fulfill_max_total_eur", 0)
      .catch(() => 0)) ?? 0
  )
  if (maxTotalEur > 0) {
    const totalEur = await convertOrderTotalToCurrency(
      storeSettings,
      order.total,
      order.currency_code,
      "eur"
    )
    if (totalEur >= maxTotalEur) {
      await setState("awaiting_approval", {
        fulfillment_error: `Siparis tutari esigi asildi (${totalEur.toFixed(2)} EUR >= ${maxTotalEur} EUR) — manuel onay gerekli`,
        amount_threshold_triggered: true,
        order_total_eur: Number(totalEur.toFixed(2)),
      })
      logger.warn(
        `[order-placed] ${orderId}: tutar esigi (${totalEur.toFixed(2)} EUR >= ${maxTotalEur} EUR) — manuel kuyruk`
      )
      return
    }
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

  // 0b) Sipariş onayı olmadan da otomatik teslimat yok — otomatik moddaysa onayı biz veririz
  const orderApproved = order.metadata?.order_approved === true || autoFulfillEnabled
  if (!orderApproved) {
    await setState('awaiting_approval', { fulfillment_error: 'Sipariş onayı bekleniyor' })
    logger.info(`[order-placed] ${orderId}: sipariş onayı yok — manuel kuyruğa alındı`)
    return
  }

  // Otomatik mod: ödeme alınmışsa sipariş + ödeme onayını otomatik işaretle
  if (autoFulfillEnabled) {
    const now = new Date().toISOString()
    order.metadata = {
      ...(order.metadata || {}),
      payment_approved: true,
      payment_approved_at: order.metadata?.payment_approved_at || now,
      payment_approved_by: order.metadata?.payment_approved_by || 'auto',
      order_approved: true,
      order_approved_at: order.metadata?.order_approved_at || now,
      order_approved_by: order.metadata?.order_approved_by || 'auto',
    }
    await orderModule.updateOrders([{ id: orderId, metadata: order.metadata }])
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
      code === "ORDER_LIMIT" ||
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
