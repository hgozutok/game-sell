import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runKinguinSync } from "../../../../utils/kinguin-sync"

// Sync sayfasinin "Simdi Senkronize Et" cagrisi.
// Tam senkron 30k+ urun uzerinde dakikalar surdugu icin istek senkron bekletilmez;
// arka planda baslatilir, durum /admin/sync-logs uzerinden izlenir.

let running = false

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (running) {
    return res.status(409).json({
      started: false,
      message: "Senkronizasyon zaten calisiyor",
    })
  }

  running = true
  const scope = req.scope
  const logger = scope.resolve("logger") as any

  setImmediate(async () => {
    try {
      const summary = await runKinguinSync(scope, { force: true })
      logger.info(`[admin/products/sync] tamamlandi: ${JSON.stringify(summary)}`)
    } catch (e: any) {
      logger.error(`[admin/products/sync] hata: ${e?.message}`)
    } finally {
      running = false
    }
  })

  res.status(202).json({
    started: true,
    message: "Senkronizasyon arka planda baslatildi. Durumu asagidaki kayitlardan izleyin.",
  })
}
