import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Sync sayfasinin bekledigi senkronizasyon gecmisi.
// Kayitlar kinguin modulunun sync log tablosundan gelir; alan adlari UI'ya gore
// normalize edilir (timestamp/status/message) ama ham alanlar da korunur.

const STALE_AFTER_MS = 2 * 60 * 1000

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const limit = Math.min(100, Number((req.query as any)?.limit || 20))

  const logs = await kinguin.listSyncLogs({}, { take: limit, order: { started_at: "DESC" } })
  const now = Date.now()

  const normalized = (logs || []).map((log: any) => {
    const startedMs = log.started_at ? new Date(log.started_at).getTime() : NaN
    const heartbeatMs = log.heartbeat_at ? new Date(log.heartbeat_at).getTime() : startedMs
    const running = log.status === "running"
    const stale = running && Number.isFinite(heartbeatMs) && now - heartbeatMs > STALE_AFTER_MS

    // UI durumu: success / failed / canceled / running / stalled
    const status = running
      ? stale
        ? "stalled"
        : "running"
      : log.status === "completed"
        ? "success"
        : log.status

    const parts = [
      `${log.items_total ?? 0} islendi`,
      `${log.items_added ?? 0} eklendi`,
      `${log.items_updated ?? 0} guncellendi`,
    ]
    if (log.items_failed) parts.push(`${log.items_failed} hata`)
    if (log.progress_total > 0) {
      parts.push(`${log.progress_processed ?? 0}/${log.progress_total} ilerleme`)
    }
    if (stale) parts.push("zaman aşımı")
    if (log.status === "canceled") parts.push("admin iptali")

    const typeLabels: Record<string, string> = {
      full: "Tam senkron",
      price: "Fiyat senkronu",
      stock: "Stok senkronu",
      import: "Ürün aktarımı",
      order_status: "Sipariş durumu",
    }
    const source = log.source || "kinguin"
    const providerLabels: Record<string, string> = {
      kinguin: "Kinguin",
      codeswholesale: "CodesWholesale",
      codesWholesale: "CodesWholesale",
      manual: "Manuel",
    }
    const providerLabel = providerLabels[source] || source
    const typeLabel = typeLabels[log.type] || log.type || "Senkron"

    return {
      id: log.id,
      type: log.type,
      type_label: typeLabel,
      source,
      provider_label: providerLabel,
      status,
      raw_status: log.status,
      is_stale: stale,
      can_cancel: running,
      timestamp: log.started_at ? new Date(log.started_at).toLocaleString("tr-TR") : "-",
      message: `${providerLabel} · ${typeLabel}`,
      details: parts.join(" · "),
      items_total: log.items_total,
      items_added: log.items_added,
      items_updated: log.items_updated,
      items_failed: log.items_failed,
      progress_total: log.progress_total ?? 0,
      progress_processed: log.progress_processed ?? 0,
      started_at: log.started_at,
      finished_at: log.finished_at,
      heartbeat_at: log.heartbeat_at || null,
      canceled_at: log.canceled_at || null,
    }
  })

  res.json({ logs: normalized, count: normalized.length })
}
