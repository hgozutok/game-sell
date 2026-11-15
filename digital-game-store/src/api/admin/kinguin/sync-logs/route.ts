import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Canli sync durumu: running + taze heartbeat = "active".
// Heartbeat 2 dakikadan eskiyse is durmus/takilmis kabul edilir; admin iptal edebilir.
const STALE_AFTER_MS = 2 * 60 * 1000

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const query = (req.query as any) || {}
  const limit = Math.min(100, Number(query.limit || 20))
  const logs = await kinguin.listSyncLogs({}, { take: limit, order: { started_at: "DESC" } })

  const now = Date.now()
  const normalized = (logs || []).map((log: any) => {
    const startedMs = log.started_at ? new Date(log.started_at).getTime() : NaN
    const heartbeatMs = log.heartbeat_at
      ? new Date(log.heartbeat_at).getTime()
      : startedMs
    const running = log.status === "running"
    const stale =
      running && Number.isFinite(heartbeatMs) && now - heartbeatMs > STALE_AFTER_MS

    // state: UI icin tek anlamli durum. DB'de "stalled" tutulmaz.
    const state = running ? (stale ? "stalled" : "active") : log.status

    const progressTotal = Number(log.progress_total || 0)
    const progressProcessed = Number(log.progress_processed || 0)
    const progressPct =
      progressTotal > 0
        ? Math.min(100, Math.max(0, Math.round((progressProcessed / progressTotal) * 100)))
        : null

    return {
      ...log,
      state,
      is_stale: stale,
      can_cancel: running,
      progress_total: progressTotal,
      progress_processed: progressProcessed,
      progress_pct: progressPct,
      heartbeat_at: log.heartbeat_at || null,
      canceled_at: log.canceled_at || null,
      last_seen_at: Number.isFinite(heartbeatMs) ? new Date(heartbeatMs).toISOString() : null,
      duration_seconds:
        Number.isFinite(startedMs) && log.finished_at
          ? Math.max(0, Math.round((new Date(log.finished_at).getTime() - startedMs) / 1000))
          : null,
    }
  })

  res.json({
    logs: normalized,
    count: normalized.length,
    active: normalized.filter((l: any) => l.state === "active").length,
    stalled: normalized.filter((l: any) => l.state === "stalled").length,
    stale_after_seconds: STALE_AFTER_MS / 1000,
  })
}
