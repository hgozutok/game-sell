import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  const query = (req.query as any) || {}
  const limit = Math.min(100, Number(query.limit || 20))
  const logs = await kinguin.listSyncLogs({}, { take: limit, order: { started_at: "DESC" } })
  res.json({ logs, count: logs.length })
}
