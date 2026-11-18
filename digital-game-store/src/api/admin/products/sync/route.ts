import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runKinguinSync, syncKinguinPrices } from "../../../../utils/kinguin-sync"

// Sync sayfasinin "Simdi Senkronize Et" cagrisi.
// Tam senkron 30k+ urun uzerinde dakikalar surdugu icin istek senkron bekletilmez;
// arka planda baslatilir, durum /admin/sync-logs uzerinden izlenir.

let running = false
const STALE_AFTER_MS = 2 * 60 * 1000

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const type: "full" | "price" = (req.body as any)?.type === "price" ? "price" : "full"
  // full_scan: last_sync_at yok sayilir, tum katalog bastan cekilir (uzun surer).
  const fullScan = (req.body as any)?.full_scan === true

  if (running) {
    return res.status(409).json({
      started: false,
      message: "Senkronizasyon zaten calisiyor",
    })
  }

  // Baska bir surecte (worker) baslamis canli sync varsa ikinci kez baslatma.
  const kinguin = req.scope.resolve("kinguin") as any
  try {
    const activeLogs = await kinguin.listSyncLogs({ status: "running" })
    const now = Date.now()
    const live = (activeLogs || []).find((log: any) => {
      const hb = log.heartbeat_at
        ? new Date(log.heartbeat_at).getTime()
        : log.started_at
          ? new Date(log.started_at).getTime()
          : NaN
      return Number.isFinite(hb) && now - hb < STALE_AFTER_MS
    })
    if (live) {
      return res.status(409).json({
        started: false,
        message: "Zaten calisan bir senkronizasyon var",
        log_id: live.id,
      })
    }
  } catch {
    // Log okunamazsa module kilidi yeterli
  }

  running = true
  const scope = req.scope
  const logger = scope.resolve("logger") as any

  setImmediate(async () => {
    try {
      const summary =
        type === "price"
          ? await syncKinguinPrices(scope)
          : await runKinguinSync(scope, { force: true, fullScan })
      logger.info(`[admin/products/sync] ${type} tamamlandi: ${JSON.stringify(summary)}`)
    } catch (e: any) {
      logger.error(`[admin/products/sync] hata: ${e?.message}`)
    } finally {
      running = false
    }
  })

  res.status(202).json({
    started: true,
    type,
    full_scan: fullScan,
    message:
      type === "price"
        ? "Fiyat senkronizasyonu arka planda baslatildi."
        : "Senkronizasyon arka planda baslatildi. Durumu asagidaki kayitlardan izleyin.",
  })
}
