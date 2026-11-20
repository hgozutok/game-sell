import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { capturePaymentWorkflow } from "@medusajs/core-flows"
import { fulfillKinguinOrderWorkflow } from "../workflows/fulfill-kinguin-order"
import { fulfillDigitalOrderWorkflow } from "../workflows/fulfill-digital-order"

/**
 * auto-fulfill-paid-orders
 *
 * Otomatik fulfillment acikken:
 *  1. Son 14 gunun dijital siparislerini tarar.
 *  2. Ödeme saglayicisindan tahsilat durumunu kontrol eder (Stripe: capture).
 *  3. Ödeme tamamlandiysa siparisi + ödemeyi otomatik onaylar.
 *  4. Key teslimat workflow'unu calistirir.
 *
 * Banka havalesi gibi manuel saglayicilar otomatik tahsil edilmez;
 * admin onayi bekler. Böylece para gelmeden key cikmaz.
 */

const AUTO_CAPTURE_PROVIDERS = ["stripe"]
const LOOKBACK_DAYS = 14
const LOCK_MINUTES = 10
const MAX_ATTEMPTS = Number(process.env.FULFILL_MAX_RETRIES || 4)

const DONE_STATES = ["fulfilled", "delivered"]
const SKIP_STATES = ["failed", "awaiting_provider_mode", "retrying"]

function isPaid(order: any) {
  const status = String(order.payment_status || "")
  return (
    ["captured", "partially_captured"].includes(status) ||
    order.metadata?.payment_approved === true
  )
}

async function getOrderPayments(container: MedusaContainer, orderId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const paymentModule = container.resolve(Modules.PAYMENT) as any

  try {
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "payment_collections.id"],
      filters: { id: orderId },
    })
    const collectionIds = (data || [])
      .flatMap((o: any) => o.payment_collections || [])
      .map((c: any) => c.id)
      .filter(Boolean)

    if (collectionIds.length === 0) return []

    return await paymentModule.listPayments({
      payment_collection_id: collectionIds,
    })
  } catch {
    return []
  }
}

async function tryAutoCapture(container: MedusaContainer, order: any, logger: any) {
  const payments = await getOrderPayments(container, order.id)

  for (const payment of payments || []) {
    const provider = String(payment.provider_id || "").toLowerCase()
    const captured = Boolean(payment.captured_at) || Number(payment.captured_amount || 0) > 0

    if (captured) return true

    const canAutoCapture = AUTO_CAPTURE_PROVIDERS.some((p) => provider.includes(p))
    if (!canAutoCapture) continue

    try {
      const { result } = await capturePaymentWorkflow(container).run({
        input: { payment_id: payment.id },
      })
      if (result?.captured_at || Number(result?.captured_amount || 0) > 0) {
        logger.info(`[auto-fulfill] ${order.id}: ödeme tahsil edildi (${provider})`)
        return true
      }
    } catch (e: any) {
      logger.warn(
        `[auto-fulfill] ${order.id}: otomatik tahsilat başarısız (${provider}): ${e?.message}`
      )
    }
  }

  return false
}

async function markAutoApproved(container: MedusaContainer, order: any) {
  const orderModule = container.resolve(Modules.ORDER) as any
  const now = new Date().toISOString()

  await orderModule.updateOrders([
    {
      id: order.id,
      metadata: {
        ...(order.metadata || {}),
        payment_approved: true,
        payment_approved_at: order.metadata?.payment_approved_at || now,
        payment_approved_by: order.metadata?.payment_approved_by || "auto",
        order_approved: true,
        order_approved_at: order.metadata?.order_approved_at || now,
        order_approved_by: order.metadata?.order_approved_by || "auto",
        fulfillment_state: "pending_fulfillment",
        fulfillment_error: null,
        auto_fulfill_lock: now,
      },
    },
  ])
}

async function runFulfillment(container: MedusaContainer, order: any, logger: any) {
  const input = {
    orderId: order.id,
    customerId: order.customer_id,
    email: order.email,
    approvedBy: "auto",
  }

  try {
    await fulfillKinguinOrderWorkflow(container).run({ input })
    logger.info(`[auto-fulfill] ${order.id}: Kinguin workflow tamamlandı`)
    return
  } catch (e: any) {
    const code = e?.code || e?.details?.code
    const noProviderLink = code === "NO_PROVIDER_LINK"

    if (!noProviderLink) {
      throw e
    }

    logger.info(
      `[auto-fulfill] ${order.id}: Kinguin eşleşmesi yok, yerel key envanteriyle teslim ediliyor`
    )

    const orderModule = container.resolve(Modules.ORDER) as any
    const productModule = container.resolve(Modules.PRODUCT) as any
    const full = await orderModule.retrieveOrder(order.id, { relations: ["items"] })
    const items = full.items || []
    const productIds = Array.from(new Set(items.map((i: any) => i.product_id).filter(Boolean)))
    const products = productIds.length
      ? await productModule.listProducts({ id: productIds }).catch(() => [])
      : []
    const productsById = new Map((products || []).map((p: any) => [p.id, p]))
    const flagged = items.filter((item: any) => {
      const product: any = productsById.get(item.product_id)
      return product?.metadata?.is_digital === true
    })
    const digitalItems = flagged.length > 0 ? flagged : items

    await fulfillDigitalOrderWorkflow(container).run({
      input: {
        orderId: order.id,
        customerId: order.customer_id,
        email: order.email,
        items: digitalItems.map((item: any) => ({
          productId: item.product_id,
          variantId: item.variant_id,
          quantity: item.quantity,
          lineItemId: item.id,
        })),
      },
    })
  }
}

export default async function autoFulfillPaidOrdersJob(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const orderModule = container.resolve(Modules.ORDER) as any
  const storeSettings = container.resolve("storeSettings") as any

  const enabled = await storeSettings
    .getSettingValue("orders.auto_fulfillment_enabled", false)
    .catch(() => false)

  if (enabled !== true) {
    return { skipped: true, reason: "auto_fulfillment_disabled" }
  }

  const orders = await orderModule.listOrders(
    {},
    { take: 200, order: { created_at: "DESC" } }
  )

  const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
  let checked = 0
  let fulfilled = 0
  let waitingPayment = 0
  let failed = 0

  for (const order of orders || []) {
    const createdAt = new Date(order.created_at).getTime()
    if (!Number.isFinite(createdAt) || createdAt < cutoff) continue

    const meta = order.metadata || {}
    if (String(order.status || "").toLowerCase() === "canceled") continue
    if (meta.digital_fulfilled === true) continue
    if (DONE_STATES.includes(String(meta.fulfillment_state || ""))) continue
    if (SKIP_STATES.includes(String(meta.fulfillment_state || ""))) continue
    if (meta.auto_fulfill_lock) {
      const lockAge = Date.now() - new Date(meta.auto_fulfill_lock).getTime()
      if (Number.isFinite(lockAge) && lockAge < LOCK_MINUTES * 60000) continue
    }

    checked++

    let paid = isPaid(order)
    if (!paid) {
      paid = await tryAutoCapture(container, order, logger)
      if (paid) {
        const fresh = await orderModule.retrieveOrder(order.id).catch(() => null)
        if (fresh) order.payment_status = fresh.payment_status
      }
    }

    if (!paid) {
      waitingPayment++
      continue
    }

    try {
      await markAutoApproved(container, order)
      await runFulfillment(container, order, logger)
      fulfilled++
    } catch (e: any) {
      failed++
      const attempts = Number(meta.fulfillment_attempts || 0) + 1
      const code = e?.code || e?.details?.code
      const manual =
        code === "READONLY" ||
        code === "NEGATIVE_MARGIN" ||
        code === "BALANCE" ||
        code === "ORDER_LIMIT" ||
        code === "PAYMENT_NOT_CAPTURED" ||
        e?.name === "KinguinOrderModeError" ||
        e?.name === "KinguinInsufficientBalanceError"

      await orderModule
        .updateOrders([
          {
            id: order.id,
            metadata: {
              ...(order.metadata || {}),
              fulfillment_state: manual
                ? "awaiting_approval"
                : attempts >= MAX_ATTEMPTS
                  ? "failed"
                  : "retrying",
              fulfillment_attempts: attempts,
              fulfillment_error: String(e?.message || e),
              fulfillment_updated_at: new Date().toISOString(),
              auto_fulfill_lock: null,
            },
          },
        ])
        .catch(() => null)

      logger.warn(`[auto-fulfill] ${order.id}: ${e?.message}`)
    }
  }

  if (checked > 0) {
    logger.info(
      `[auto-fulfill] checked=${checked} fulfilled=${fulfilled} waiting_payment=${waitingPayment} failed=${failed}`
    )
  }

  return { checked, fulfilled, waitingPayment, failed }
}

export const config = {
  name: "auto-fulfill-paid-orders",
  schedule: "*/2 * * * *",
}
