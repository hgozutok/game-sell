import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import KeyInventoryService from "../../../../../modules/key-inventory/service"

// GET /store/orders/:id/digital-keys - Get digital keys for an order
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const keyInventoryService = req.scope.resolve("keyInventory") as KeyInventoryService
  const orderModuleService = req.scope.resolve(Modules.ORDER) as any
  
  const { id: orderId } = req.params
  const customerId = (req as any).auth?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  // Verify order belongs to customer
  const order = await orderModuleService.retrieveOrder(orderId)

  if (order.customer_id !== customerId) {
    return res.status(403).json({ message: "Access denied" })
  }

  const keys = await keyInventoryService.getKeysByOrder(orderId)

  // Ödeme + sipariş onayı (veya teslimat) tamamlanmadan key gösterilmez
  const metadata = order.metadata || {}
  const paidStatuses = ["captured", "partially_captured"]
  const paymentReleased =
    metadata.payment_approved === true || paidStatuses.includes(String(order.payment_status))

  if (!paymentReleased || metadata.order_approved !== true) {
    return res.status(403).json({
      message: "Key'ler ödeme ve sipariş onayı sonrası erişilebilir",
      payment_approved: metadata.payment_approved === true,
      order_approved: metadata.order_approved === true,
      digital_fulfilled: metadata.digital_fulfilled === true,
    })
  }

  res.json({
    digital_keys: keys,
    count: keys.length,
  })
}

