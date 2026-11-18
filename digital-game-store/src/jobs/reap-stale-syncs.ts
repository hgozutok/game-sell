import { MedusaContainer } from "@medusajs/framework/types"

/**
 * Süreci ölen (crash / container restart) synclari temizler.
 * Backend yeniden basladiginda sync_log'da "running" takilan kayitlar
 * heartbeat süresi dolunca failed yapilir; boylece admin panelde
 * donmus senkronlar birikmez ve yeni syncler temiz baslar.
 */
export default async function reapStaleSyncsJob(container: MedusaContainer) {
  const kinguin = container.resolve("kinguin") as any
  const reaped = await kinguin.reapStaleSyncLogs(180).catch(() => 0)
  return { success: true, reaped }
}

export const config = {
  name: "reap-stale-syncs",
  schedule: "*/5 * * * *", // 5 dakikada bir
}
