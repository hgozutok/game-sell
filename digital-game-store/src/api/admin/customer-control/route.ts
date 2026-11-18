import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  customerAdminView,
  isCustomerDisabled,
  summarizeCustomerOrders,
} from "../../../utils/customer-status"

// Sayfa basina en fazla musteri; panel 20'lik sayfalar kullanir.
const MAX_LIMIT = 100
// Durum filtresi ve ozet icin tek seferde taranan musteri sayisi.
const SCAN_CAP = 2000
// Bir sayfadaki musterilerin siparisleri icin ust sinir (cok buyuk magazalarda koruma).
const ORDER_SCAN_CAP = 5000

const CUSTOMER_FIELDS = [
  "id",
  "email",
  "first_name",
  "last_name",
  "phone",
  "has_account",
  "created_at",
  "metadata",
]

function asString(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "")
  return value === undefined || value === null ? "" : String(value)
}

/**
 * GET /admin/customer-control
 * Query: q (ad/e-posta aramasi), status (all|active|disabled), limit, offset
 *
 * Musteri listesi + her musteri icin siparis sayisi, toplam harcama ve son
 * siparis tarihi. Yonetim panelindeki "Kullanicilar" sayfasi bu ucu kullanir.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const orderModule = req.scope.resolve(Modules.ORDER) as any

    const q = asString(req.query.q).trim()
    const status = asString(req.query.status).trim().toLowerCase()
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_LIMIT)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const filter: Record<string, any> = {}
    if (q) filter.q = q

    let customers: any[] = []
    let count = 0
    let scanCapped = false

    if (status === "active" || status === "disabled") {
      // metadata JSON alani modul filtresinde sorgulanamiyor; eslesenleri
      // bellekte ayirip sayfalama uygulanir.
      const all = (await customerModule.listCustomers(filter, {
        select: CUSTOMER_FIELDS,
        take: SCAN_CAP,
        order: { created_at: "DESC" },
      })) as any[]
      const matched = (all || []).filter((customer: any) =>
        status === "disabled"
          ? isCustomerDisabled(customer.metadata)
          : !isCustomerDisabled(customer.metadata)
      )
      scanCapped = (all || []).length >= SCAN_CAP
      count = matched.length
      customers = matched.slice(offset, offset + limit)
    } else {
      const [rows, total] = (await customerModule.listAndCountCustomers(filter, {
        select: CUSTOMER_FIELDS,
        take: limit,
        skip: offset,
        order: { created_at: "DESC" },
      })) as [any[], number]
      customers = rows || []
      count = total || 0
    }

    // --- Sayfadaki musterilerin siparis ozeti ---
    const customerIds = customers.map((customer) => customer.id).filter(Boolean)
    let orders: any[] = []
    let ordersCapped = false
    if (customerIds.length) {
      orders = (await orderModule.listOrders(
        { customer_id: customerIds },
        {
          relations: ["items"],
          take: ORDER_SCAN_CAP,
          order: { created_at: "DESC" },
        }
      )) as any[]
      ordersCapped = (orders || []).length >= ORDER_SCAN_CAP
    }

    const ordersByCustomer = new Map<string, any[]>()
    for (const order of orders || []) {
      const key = order?.customer_id
      if (!key) continue
      const bucket = ordersByCustomer.get(key)
      if (bucket) bucket.push(order)
      else ordersByCustomer.set(key, [order])
    }

    const items = customers.map((customer) => {
      const summary = summarizeCustomerOrders(ordersByCustomer.get(customer.id) || [])
      return {
        ...customerAdminView(customer),
        ...summary,
      }
    })

    // --- Genel sayaclar (filtreden bagimsiz) ---
    let summary: Record<string, any> = { total: 0, active: 0, disabled: 0, capped: false }
    try {
      const light = (await customerModule.listCustomers(
        {},
        { select: ["id", "metadata"], take: SCAN_CAP, order: { created_at: "DESC" } }
      )) as any[]
      const disabled = (light || []).filter((customer) => isCustomerDisabled(customer.metadata)).length
      summary = {
        total: (light || []).length,
        active: (light || []).length - disabled,
        disabled,
        capped: (light || []).length >= SCAN_CAP,
      }
    } catch {
      /* sayaclar ikincil; hata listede gosterilmez */
    }

    res.json({
      customers: items,
      count,
      limit,
      offset,
      summary,
      // Tarama sinirina takildiysa panel kullaniciyi uyarir.
      scan_capped: scanCapped,
      orders_capped: ordersCapped,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Müşteri listesi alınamadı",
      error: error?.message,
    })
  }
}
