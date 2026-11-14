// Hizli satin alma guard'i: kisa surede cok siparis dusersen otomatik fulfillment
// manuel moda cekilir (orders.auto_fulfillment_enabled=false). Admin inceledikten
// sonra ayarlardan yeniden acar. Nitelik: siparis sayisi store geneli — e-posta
// rotasyonuyla atlatilmasin diye musteri basina degil.
import { Modules } from "@medusajs/framework/utils"

export interface VelocityGuardResult {
  triggered: boolean
  count: number
  windowMinutes: number
  maxOrders: number
  alreadyDisabled: boolean
}

export async function evaluatePurchaseVelocity(
  container: any,
  logger: any
): Promise<VelocityGuardResult> {
  const orderModule = container.resolve(Modules.ORDER) as any
  const storeSettings = container.resolve("storeSettings") as any

  const windowMinutes = Number(
    (await storeSettings.getSettingValue("orders.velocity_window_minutes", 30)) ?? 30
  )
  const maxOrders = Number(
    (await storeSettings.getSettingValue("orders.velocity_max_orders", 5)) ?? 5
  )

  // pencere icindeki siparisleri say (canceled haric; take ust saglam olsun)
  const orders = await orderModule
    .listOrders({}, { take: 1000, order: { created_at: "DESC" } })
    .catch(() => [])
  const cutoff = Date.now() - windowMinutes * 60 * 1000
  const recent = (orders || []).filter((o: any) => {
    if (String(o.status || "").toLowerCase() === "canceled") return false
    const t = new Date(o.created_at).getTime()
    return Number.isFinite(t) && t >= cutoff
  })

  if (recent.length < maxOrders) {
    return { triggered: false, count: recent.length, windowMinutes, maxOrders, alreadyDisabled: false }
  }

  const alreadyDisabled = (await storeSettings.getSettingValue("orders.auto_fulfillment_enabled", false)) !== true
  if (alreadyDisabled) {
    return { triggered: true, count: recent.length, windowMinutes, maxOrders, alreadyDisabled: true }
  }

  // Manuel moda cek + alarim damgası
  await storeSettings.setSetting("orders.auto_fulfillment_enabled", false, {
    category: "orders",
    description: "velocity guard tarafindan otomatik kapatildi",
  })
  await storeSettings.setSetting("orders.velocity_guard_triggered_at", new Date().toISOString(), {
    category: "orders",
    description: "son hiz alarmi zamanı",
  })

  logger.warn(
    `[velocity-guard] ${recent.length} siparis/${windowMinutes}dk (esik ${maxOrders}) — otomatik fulfillment manuel moda cekildi`
  )

  const auditLog = container.resolve("auditLog") as any
  await auditLog
    .log({
      action: "velocity_guard_triggered",
      entity: "order",
      entity_id: null,
      diff: {
        orders_in_window: recent.length,
        window_minutes: windowMinutes,
        threshold: maxOrders,
        auto_fulfillment_enabled: false,
      },
      actor_email: "system:velocity-guard",
    })
    .catch((e: any) => logger.warn(`[velocity-guard] audit kaydi yazilamadi: ${e?.message}`))

  return { triggered: true, count: recent.length, windowMinutes, maxOrders, alreadyDisabled: false }
}
