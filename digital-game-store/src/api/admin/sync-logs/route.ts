import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Sync sayfasinin bekledigi senkronizasyon gecmisi.
// Kayitlar kinguin modulunun sync log tablosundan gelir; alan adlari UI'ya gore
// normalize edilir (timestamp/status/message) ama ham alanlar da korunur.

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const limit = Math.min(100, Number((req.query as any)?.limit || 20))

  const logs = await kinguin.listSyncLogs({}, { take: limit, order: { started_at: "DESC" } })

  const normalized = (logs || []).map((log: any) => {
    const status =
      log.status === "completed"
        ? "success"
        : log.status === "failed"
          ? "failed"
          : log.status === "running"
            ? "running"
            : log.status

    const parts = [
      `${log.items_total ?? 0} islendi`,
      `${log.items_added ?? 0} eklendi`,
      `${log.items_updated ?? 0} guncellendi`,
    ]
    if (log.items_failed) parts.push(`${log.items_failed} hata`)

    return {
      id: log.id,
      type: log.type,
      status,
      raw_status: log.status,
      timestamp: log.started_at ? new Date(log.started_at).toLocaleString("tr-TR") : "-",
      message: `${log.type === "price" ? "Fiyat" : "Tam"} senkron`,
      details: parts.join(" · "),
      items_total: log.items_total,
      items_added: log.items_added,
      items_updated: log.items_updated,
      items_failed: log.items_failed,
      started_at: log.started_at,
      finished_at: log.finished_at,
    }
  })

  res.json({ logs: normalized, count: normalized.length })
}
