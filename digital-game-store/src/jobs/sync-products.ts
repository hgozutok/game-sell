import { MedusaContainer } from "@medusajs/framework/types"
import { runKinguinSync, shouldRunSync } from "../utils/kinguin-sync"

/**
 * Periyodik Kinguin senkronizasyonu.
 *
 * Medusa job schedule'i boot'ta sabitlenir; admin'den degistirilebilir periyot
 * icin job 15 dakikada bir uyanir ve kinguin_settings.sync_interval_minutes
 * dolmussa gercek senkronu calistirir (runKinguinSync).
 */
export default async function syncProductsJob(container: MedusaContainer) {
  const logger = container.resolve("logger")

  const { due, reason } = await shouldRunSync(container)
  if (!due) {
    logger.info(`[sync-products] atlandi (${reason})`)
    return { success: true, skipped: true, reason }
  }

  logger.info("[sync-products] Kinguin senkronizasyonu basliyor...")
  const summary = await runKinguinSync(container, { force: true })
  logger.info(`[sync-products] tamamlandi: ${JSON.stringify(summary)}`)
  return { success: summary.status === "completed", summary }
}

export const config = {
  name: "sync-products",
  schedule: "*/15 * * * *", // 15 dk'da bir uyan; gercek periyot ayarlardan gelir
}
