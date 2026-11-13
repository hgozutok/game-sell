import { MedusaContainer } from "@medusajs/framework/types"
import { syncPendingKinguinOrders } from "../utils/kinguin-order-sync"

/**
 * Bekleyen Kinguin siparislerini poll eder:
 * - status completed olmuslardan key'leri ceker (sifreli saklar)
 * - canceled olmuslari failed isaretler
 * (webhook geldiginde de ayni mantik calisir; bu job yedekleme mekanizmasidir)
 */
export default async function syncOrderStatusJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const summary = await syncPendingKinguinOrders(container)
  if (summary.processed > 0 || summary.errors.length > 0) {
    logger.info(`[sync-order-status] ${JSON.stringify(summary)}`)
  }
  return { success: true, ...summary }
}

export const config = {
  name: "sync-order-status",
  schedule: "*/2 * * * *", // 2 dakikada bir
}
