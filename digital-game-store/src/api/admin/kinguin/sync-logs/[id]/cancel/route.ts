import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { markKinguinSyncCanceled } from "../../../../../../utils/kinguin-sync"

/**
 * POST /admin/kinguin/sync-logs/:id/cancel
 *
 * Calisan (veya heartbeat'i eskimis takili) bir senkronu iptal eder.
 * Calisan is parcacigi DB'deki canceled durumunu gorup donguden cikar.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const id = (req.params as any)?.id as string | undefined

  if (!id) {
    return res.status(400).json({ message: "Senkron kaydı gerekli" })
  }

  const rows = await kinguin.listSyncLogs({ id })
  const log = rows?.[0]
  if (!log) {
    return res.status(404).json({ message: "Senkron kaydı bulunamadı" })
  }
  if (log.status !== "running") {
    return res.status(409).json({
      message: "Bu senkron zaten sonlanmış",
      status: log.status,
    })
  }

  markKinguinSyncCanceled(id)
  const canceled = await kinguin.cancelSyncLog(id, "admin")

  return res.json({
    canceled: true,
    id,
    status: "canceled",
    log: canceled,
  })
}
