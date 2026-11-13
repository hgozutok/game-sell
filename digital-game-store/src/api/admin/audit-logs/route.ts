import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/** GET /admin/audit-logs — admin denetim kayitlari (son kayitlar, filtreli) */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const auditLog = req.scope.resolve("auditLog") as any
  const url = new URL(req.url, "http://localhost")
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200)
  const entity = url.searchParams.get("entity")
  const action = url.searchParams.get("action")

  const filters: Record<string, any> = {}
  if (entity) filters.entity = entity
  if (action) filters.action = action

  // listAuditLogs(filters, config) — order/take filters icine yazilmaz
  const logs = await auditLog.listAuditLogs(filters, {
    order: { created_at: "DESC" },
    take: limit,
  })

  res.json({ logs })
}
