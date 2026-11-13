import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const QUEUE_STATES = [
  "awaiting_approval",
  "awaiting_provider_mode",
  "pending_fulfillment",
  "provider_order_placed",
  "retrying",
  "failed",
]

// Manuel fulfillment kuyrugu — siparis metadata fulfillment_state'e gore
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const orderModule = req.scope.resolve(Modules.ORDER) as any
  const kinguin = req.scope.resolve("kinguin") as any

  const orders = await orderModule.listOrders(
    {},
    { take: 200, order: { created_at: "DESC" }, relations: ["items"] }
  )
  const queued = (orders || []).filter((o: any) =>
    QUEUE_STATES.includes((o.metadata as any)?.fulfillment_state)
  )

  const settings = await kinguin.getSettings()
  let balance = null
  try {
    balance = (await kinguin.getBalance()).balance
  } catch {}

  res.json({
    orders: queued.map((o: any) => ({
      id: o.id,
      display_id: o.display_id,
      email: o.email,
      created_at: o.created_at,
      total: o.total,
      items: (o.items || []).map((i: any) => ({
        id: i.id,
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        sku: i.variant?.sku,
      })),
      metadata: o.metadata,
    })),
    count: queued.length,
    kinguin: { order_mode: settings.order_mode, balance, min_balance: settings.min_balance },
  })
}
