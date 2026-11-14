import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

/**
 * POST /admin/order-control/:id/kinguin-return-keys
 *
 * ASAMA 1 — iade TALEBI olusturur (Kinguin'e hicbir istek gitmez).
 * Onay ayri adimda verilir: POST .../kinguin-return-keys/approve
 *
 * ESA guide §14 kurallari (provider tarafindan uygulanir):
 *   - key hicbir zaman indirilmediyse (claim edilmediyse) iade edilebilir
 *   - key indirme sonrasi 24 saatte iade yok
 *   - wholesale / preorder iade edilmez
 *   - siparis basina tek iade istegi — tum uygun key'leri kapsar
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const kinguin = req.scope.resolve("kinguin") as any
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const auditLog = req.scope.resolve("auditLog") as any
    const { id: medusaOrderId } = req.params

    const row = await kinguin.getOrderByMedusaOrder(medusaOrderId)
    if (!row) {
      return res.status(404).json({ message: "Bu siparis icin Kinguin siparisi yok" })
    }

    if (["canceled", "refunded", "failed"].includes(row.status)) {
      return res.status(409).json({
        message: `Kinguin siparisi zaten ${row.status} — iade talebi olusturulamaz`,
      })
    }
    if (row.status === "completed" || row.keys_delivered_at) {
      // completed = key'ler indirildi (claim edildi) — iade edilemez
      return res.status(409).json({
        message:
          "Key'ler indirilmis (claim edilmis) — ESA kurallarina gore iade edilemez. Iade icin Kinguin destek ile iletisime gecin.",
        code: "KEYS_ALREADY_CLAIMED",
      })
    }

    const medusaOrder = await orderModule.retrieveOrder(medusaOrderId).catch(() => null)
    if (medusaOrder?.metadata?.digital_fulfilled === true) {
      return res.status(409).json({
        message: "Key'ler musteriye teslim edilmis — iade talebi olusturulamaz",
        code: "ALREADY_DELIVERED",
      })
    }
    if (medusaOrder?.metadata?.kinguin_return_status === "pending_approval") {
      return res.status(409).json({
        message: "Bekleyen bir iade talebi zaten var — onay bekleniyor",
        code: "RETURN_ALREADY_PENDING",
      })
    }

    // Talebi metadata'ya yaz — hicbir cagri yapilmaz
    const now = new Date().toISOString()
    await orderModule.updateOrders([
      {
        id: medusaOrderId,
        metadata: {
          ...(medusaOrder?.metadata || {}),
          kinguin_return_status: "pending_approval",
          kinguin_return_requested_at: now,
          kinguin_return_requested_by:
            (req as any).auth_context?.actor_id ?? null,
          kinguin_return_kinguin_order_id: row.order_id,
        },
      },
    ])

    await auditLog.log({
      action: "order.kinguin_return_requested",
      entity: "order",
      entity_id: medusaOrderId,
      diff: { kinguin_order_id: row.order_id, status: "pending_approval" },
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })

    res.json({
      ok: true,
      kinguin_order_id: row.order_id,
      kinguin_return_status: "pending_approval",
      message:
        "Iade talebi olusturuldu (admin onayi bekliyor). Onay verilince Kinguin'e iade istegi gidecek.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Iade talebi olusturulamadi",
      error: String(error?.message || error),
    })
  }
}
