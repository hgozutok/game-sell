import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { markKinguinSyncCanceled } from "../../../../../utils/kinguin-sync"

const STALE_AFTER_MS = 2 * 60 * 1000

/**
 * POST /admin/kinguin/sync-logs/cancel
 * Body: { ids?: string[], stale?: boolean }
 *
 * - ids verilirse o kayitlar (running ise) iptal edilir.
 * - stale=true (varsayilan) ise heartbeat'i eskimis tum running kayitlar iptal edilir.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const body = (req.body || {}) as any
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
  const staleOnly = body.stale !== false

  const running = await kinguin.listSyncLogs({ status: "running" })
  const now = Date.now()
  const targets = running.filter((log: any) => {
    if (ids.length > 0) return ids.includes(log.id)
    if (!staleOnly) return false
    const heartbeat = log.heartbeat_at
      ? new Date(log.heartbeat_at).getTime()
      : log.started_at
        ? new Date(log.started_at).getTime()
        : NaN
    return !Number.isFinite(heartbeat) || now - heartbeat > STALE_AFTER_MS
  })

  const canceled: string[] = []
  for (const log of targets) {
    markKinguinSyncCanceled(log.id)
    await kinguin.cancelSyncLog(log.id, ids.length > 0 ? "admin" : "admin:stale")
    canceled.push(log.id)
  }

  return res.json({
    canceled: canceled.length,
    ids: canceled,
    scanned: running.length,
  })
}
