// Musteri hesabi durumu (aktif/pasif) yardimcilari.
//
// Pasiflik customer.metadata.disabled uzerinde tutulur; Medusa'nin customer
// tablosunda boyle bir kolon olmadigi icin metadata en pratik yer. Bu modul
// ayni kurallari API, middleware ve testlerde tek yerden uygular.

export const ACCOUNT_DISABLED_CODE = "account_disabled"
export const ACCOUNT_DISABLED_MESSAGE =
  "Hesabınız yönetici tarafından devre dışı bırakıldı. Destek ekibiyle iletişime geçin."

/** metadata.disabled true ise hesap pasiftir. */
export function isCustomerDisabled(metadata: any): boolean {
  return metadata?.disabled === true
}

/**
 * Yeni metadata uretir: mevcut alanlar korunur, yalnizca durum alanlari degisir.
 * Aktif yapildiginda disabled_at temizlenir (null yazilir).
 */
export function buildCustomerStatusMetadata(
  metadata: any,
  active: boolean,
  now: Date = new Date()
): Record<string, any> {
  const current =
    metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}
  return {
    ...current,
    disabled: !active,
    disabled_at: active ? null : now.toISOString(),
  }
}

/**
 * Siparis tutari: Medusa v2'de order.total ancak summary yuklenince dolar.
 * Yuklenmemisse kalemlerden hesaplanir (magaza tamamen dijital; kargo yok).
 * Donen deger minor unit'tir (magaza genelindeki /100 kurali ile uyumlu).
 */
export function orderTotalMinor(order: any): number {
  const direct = Number(order?.total)
  if (Number.isFinite(direct) && direct > 0) return direct
  const items = Array.isArray(order?.items) ? order.items : []
  const sum = items.reduce(
    (total: number, item: any) =>
      total + Number(item?.unit_price || 0) * Number(item?.quantity || 0),
    0
  )
  return Number.isFinite(sum) ? sum : 0
}

export interface CustomerAggregate {
  order_count: number
  total_spent: number
  currency_code: string | null
  currency_totals: Array<{ currency_code: string; total: number }>
  last_order_at: string | null
}

/** Bir musterinin siparislerinden sayi + harcama ozeti cikarir. */
export function summarizeCustomerOrders(orders: any[]): CustomerAggregate {
  const perCurrency = new Map<string, number>()
  let lastOrderAt: string | null = null
  let latestOrderCurrency: string | null = null

  for (const order of orders || []) {
    const currency = String(order?.currency_code || "usd").toLowerCase()
    perCurrency.set(currency, (perCurrency.get(currency) || 0) + orderTotalMinor(order))

    const createdAt = order?.created_at ? new Date(order.created_at).toISOString() : null
    if (createdAt && (!lastOrderAt || createdAt > lastOrderAt)) {
      lastOrderAt = createdAt
      latestOrderCurrency = currency
    }
  }

  const currencyTotals = Array.from(perCurrency.entries())
    .map(([currency_code, total]) => ({ currency_code, total }))
    .sort((a, b) => b.total - a.total)

  const totalSpent = currencyTotals.reduce((sum, entry) => sum + entry.total, 0)

  return {
    order_count: (orders || []).length,
    total_spent: totalSpent,
    // Karisik para biriminde en son siparisin birimi gosterilir.
    currency_code: latestOrderCurrency || currencyTotals[0]?.currency_code || null,
    currency_totals: currencyTotals,
    last_order_at: lastOrderAt,
  }
}

/** API/middleware icin guvenli musteri gorunumu (metadata sizmaz). */
export function customerAdminView(customer: any) {
  const metadata =
    customer?.metadata && typeof customer.metadata === "object" ? customer.metadata : {}
  return {
    id: customer?.id,
    email: customer?.email,
    first_name: customer?.first_name || "",
    last_name: customer?.last_name || "",
    phone: customer?.phone || null,
    has_account: customer?.has_account === true,
    created_at: customer?.created_at || null,
    active: !isCustomerDisabled(metadata),
    disabled_at: metadata.disabled_at || null,
    email_verified: metadata.email_verified === true,
  }
}
