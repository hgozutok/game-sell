// Tahsilat dogrulamasi — key/urun saglayicisina para harcanmadan ONCE
// musterinin odemesinin gercekten alindigini kesinlestirir.
//
// Neden: fulfillment'i tetikleyen birden fazla yol var (order.placed, otomatik
// job, retry job, admin onayi). Gate'ler cagirici tarafindaysa bir yol
// atlandiginda parasiz key cikabilir. Bu util dogrudan odeme modulunden GERCEK
// capture kaydini sorgular; islem kaydi olmadan key cikmaz.
//
// Gecerli tahsilat sayilan durumlar:
//   1) Odeme kaydinda capture islemi (status=captured / captured_at /
//      captured_amount>0) VE tahsil edilen tutar >= siparis toplami
//   2) metadata.payment_approved === true — admin havalesi dogrulamasi
//      (allowAdminApproved ile kapatilabilir)
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export interface PaymentCaptureStatus {
  paid: boolean
  /** 'capture' = gercek odeme kaydi, 'admin_approved' = admin havalesi onayi */
  source?: "capture" | "admin_approved"
  provider?: string
  paymentId?: string
  capturedMinor: number
  expectedMinor: number
  currency?: string
  reason: string
}

/** Siparis satirlarindan beklenen toplami (minor) hesaplar. */
export function expectedOrderTotalMinor(order: any): number {
  const direct = Number(order?.total)
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct)
  const items = Array.isArray(order?.items) ? order.items : []
  const sum = items.reduce(
    (total: number, item: any) =>
      total + Number(item?.unit_price || 0) * Number(item?.quantity || 0),
    0
  )
  return Number.isFinite(sum) ? Math.round(sum) : 0
}

/** Siparise bagli odeme kayitlarini ceker (payment_collection link uzerinden). */
export async function getOrderPayments(container: any, orderId: string): Promise<any[]> {
  const scope = container.scope ?? container
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as any
  const paymentModule = scope.resolve(Modules.PAYMENT) as any

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

  return (await paymentModule.listPayments({
    payment_collection_id: collectionIds,
  }).catch(() => [])) as any[]
}

/**
 * Gercek tahsilat dogrulamasi. Sonuc paid=false ise fulfillment akisi
 * parasiz ilerlememeli — cagiran taraf awaiting_approval'a alir.
 */
export async function verifyOrderPaymentCaptured(
  container: any,
  orderId: string,
  opts: { allowAdminApproved?: boolean } = {}
): Promise<PaymentCaptureStatus> {
  const scope = container.scope ?? container
  const orderModule = scope.resolve(Modules.ORDER) as any

  const order = await orderModule.retrieveOrder(orderId, { relations: ["items"] }).catch(
    () => null
  )
  const base = {
    capturedMinor: 0,
    expectedMinor: 0,
    reason: "Siparis bulunamadi",
  }
  if (!order) {
    return { paid: false, ...base }
  }

  const expectedMinor = expectedOrderTotalMinor(order)
  // %1 tolerans (kur donusumu/virgul yuvarlamasi payi); asagisi kismi tahsilat sayilir.
  const minCaptured = Math.max(1, Math.round(expectedMinor * 0.99))

  let payments: any[] = []
  try {
    payments = await getOrderPayments(container, orderId)
  } catch {
    payments = []
  }

  for (const payment of payments || []) {
    const capturedAmount = Number(payment.captured_amount || 0)
    const isCaptured =
      String(payment.status || "").toLowerCase() === "captured" ||
      Boolean(payment.captured_at) ||
      capturedAmount > 0

    if (!isCaptured) continue

    const effectiveCaptured = capturedAmount > 0 ? capturedAmount : Number(payment.amount || 0)
    if (expectedMinor > 0 && effectiveCaptured < minCaptured) {
      // kismi tahsilat — tam tahsilat bekle
      continue
    }
    return {
      paid: true,
      source: "capture",
      provider: String(payment.provider_id || ""),
      paymentId: String(payment.id || ""),
      capturedMinor: effectiveCaptured,
      expectedMinor,
      currency: payment.currency_code || order.currency_code,
      reason: `Tahsilat dogrulandi (${payment.provider_id}, ${effectiveCaptured}/${expectedMinor})`,
    }
  }

  if (opts.allowAdminApproved !== false && order.metadata?.payment_approved === true) {
    return {
      paid: true,
      source: "admin_approved",
      provider: String(order.metadata?.payment_provider || "manual"),
      capturedMinor: expectedMinor,
      expectedMinor,
      currency: order.currency_code,
      reason: `Admin onayli tahsilat (payment_approved_by=${order.metadata?.payment_approved_by || "admin"})`,
    }
  }

  return {
    paid: false,
    capturedMinor: 0,
    expectedMinor,
    currency: order.currency_code,
    reason: payments.length
      ? "Tahsilat kaydi yok — odeme authorize edilmis ama capture edilmemis olabilir"
      : "Siparise bagli odeme kaydi yok",
  }
}
