import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

// GET /store/customers/me/orders — giris yapmus musterinin siparisleri
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = ((req as any).auth_context?.actor_id ?? (req as any).auth?.actor_id)
  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const orderModule = req.scope.resolve(Modules.ORDER) as any
  const orders = await orderModule.listOrders(
    { customer_id: customerId },
    {
      relations: ["items"],
      take: 100,
      order: { created_at: "DESC" },
    }
  )

  res.json({
    orders: orders.map((o: any) => ({
      id: o.id,
      display_id: o.display_id,
      status: o.status,
      payment_status: o.payment_status,
      created_at: o.created_at,
      // listOrders totals hesaplamaz — satirlardan hesapla (fee satiri dahil)
      total:
        o.total ??
        (o.items || []).reduce(
          (sum: number, i: any) => sum + Number(i.unit_price || 0) * Number(i.quantity || 0),
          0
        ),
      currency_code: o.currency_code,
      items: (o.items || []).map((i: any) => ({
        id: i.id,
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      metadata: {
        payment_method: o.metadata?.payment_method ?? null,
        payment_fee_minor: o.metadata?.payment_fee_minor ?? null,
        payment_fee_currency: o.metadata?.payment_fee_currency ?? null,
        payment_approved: o.metadata?.payment_approved === true,
        order_approved: o.metadata?.order_approved === true,
        digital_fulfilled: o.metadata?.digital_fulfilled === true,
      },
    })),
    count: orders.length,
  })
}
