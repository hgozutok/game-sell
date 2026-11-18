import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { KinguinNoKeysToReturnError } from "../../../../../../modules/kinguin/types"


/**
 * POST /admin/order-control/:id/kinguin-return-keys/approve
 *
 * ASAMA 2 — bekleyen iade talebini onaylar/reddeder.
 *
 *   { approved: true }  -> Kinguin'e iade istegi gonderilir (ESA guide §14:
 *                          POST /v2/order/{orderId}/keys/return); refund
 *                          Kinguin EUR bakiyesine geri yazilir.
 *   { approved: false } -> talep reddedilir, metadata temizlenir.
 *
 * Onay aninda guard'lar taze durumla tekrar kontrol edilir; key'ler arada
 * indirilmisse (claim edilmisse) iade 409 ile durur.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const kinguin = req.scope.resolve("kinguin") as any
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const auditLog = req.scope.resolve("auditLog") as any
    const { id: medusaOrderId } = req.params
    const body = (req.body || {}) as any
    const approved = body.approved !== false

    const medusaOrder = await orderModule.retrieveOrder(medusaOrderId).catch(() => null)
    if (!medusaOrder) {
      return res.status(404).json({ message: "Siparis bulunamadi" })
    }
    const meta = medusaOrder.metadata || {}

    if (meta.kinguin_return_status !== "pending_approval") {
      return res.status(409).json({
        message: "Bekleyen iade talebi yok — once talep olusturun",
        code: "NO_PENDING_RETURN",
      })
    }
    const row = await kinguin.getOrderByMedusaOrder(medusaOrderId)
    if (!row) {
      return res.status(404).json({ message: "Bu siparis icin Kinguin siparisi yok" })
    }

    const clearReturnMeta = (extra: Record<string, any> = {}) => ({
      ...meta,
      kinguin_return_status: approved ? "executed" : "rejected",
      kinguin_return_resolved_at: new Date().toISOString(),
      kinguin_return_resolved_by: (req as any).auth_context?.actor_id ?? null,
      ...extra,
    })

    if (!approved) {
      await orderModule.updateOrders([
        { id: medusaOrderId, metadata: clearReturnMeta() },
      ])
      await auditLog.log({
        action: "order.kinguin_return_rejected",
        entity: "order",
        entity_id: medusaOrderId,
        diff: { kinguin_order_id: row.order_id },
        actor_id: (req as any).auth_context?.actor_id ?? null,
        ip: req.headers?.["x-forwarded-for"] ?? null,
      })
      return res.json({
        ok: true,
        approved: false,
        message: "Iade talebi reddedildi",
      })
    }

    // Onay aninda taze guard kontrolleri
    const freshRow = await kinguin.getOrderByMedusaOrder(medusaOrderId)
    if (freshRow.status === "completed" || freshRow.keys_delivered_at) {
      await orderModule.updateOrders([
        {
          id: medusaOrderId,
          metadata: clearReturnMeta({
            kinguin_return_status: "blocked",
            kinguin_return_error: "key'ler arada indirildi (claim) — iade edilemez",
          }),
        },
      ])
      return res.status(409).json({
        message:
          "Key'ler arada indirilmis (claim edilmis) — iade edilemez. Talep 'blocked' olarak kapatildi.",
        code: "KEYS_ALREADY_CLAIMED",
      })
    }
    const freshOrder = await orderModule.retrieveOrder(medusaOrderId).catch(() => null)
    if (freshOrder?.metadata?.digital_fulfilled === true) {
      await orderModule.updateOrders([
        {
          id: medusaOrderId,
          metadata: clearReturnMeta({
            kinguin_return_status: "blocked",
            kinguin_return_error: "key'ler musteriye teslim edildi — iade edilemez",
          }),
        },
      ])
      return res.status(409).json({
        message: "Key'ler musteriye teslim edilmis — iade edilemez.",
        code: "ALREADY_DELIVERED",
      })
    }

    let returned: any
    try {
      returned = await kinguin.returnKinguinOrderKeys(row.order_id)
    } catch (e: any) {
      if (e instanceof KinguinNoKeysToReturnError) {
        await orderModule.updateOrders([
          {
            id: medusaOrderId,
            metadata: clearReturnMeta({
              kinguin_return_status: "failed",
              kinguin_return_error: "Kinguin: iadeye uygun key yok (NoKeysToReturn)",
            }),
          },
        ])
        return res.status(409).json({
          message:
            "Kinguin: iade kriterlerine uyan key yok (hepsi claim edilmis veya 24 saat gecti).",
          code: "NO_KEYS_TO_RETURN",
        })
      }
      throw e
    }

    const count = Array.isArray(returned) ? returned.length : 0

    // Yerel kayit + medusa siparisini guncelle
    await kinguin.updateLocalOrderStatus(row.order_id, {
      status: "refunded",
      error: `admin onayli iade (${count} key) — refund Kinguin bakiyesine yazildi`,
    })
    await orderModule.updateOrders([
      {
        id: medusaOrderId,
        metadata: clearReturnMeta({
          kinguin_return_returned_keys: count,
          fulfillment_state: "awaiting_approval",
          fulfillment_error: `Kinguin key iadesi onaylandi (${count} key) — musteri iadesi ayri islenmeli`,
          fulfillment_updated_at: new Date().toISOString(),
        }),
      },
    ])

    await auditLog.log({
      action: "order.kinguin_return_approved",
      entity: "order",
      entity_id: medusaOrderId,
      diff: {
        kinguin_order_id: row.order_id,
        returned_keys: count,
      },
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })

    res.json({
      ok: true,
      approved: true,
      kinguin_order_id: row.order_id,
      returned_keys: count,
      returned,
      message: `${count} key iade edildi; tutar Kinguin EUR bakiyesine geri yazildi.`,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Iade onayi basarisiz",
      error: String(error?.message || error),
    })
  }
}
