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

  res.json({
    digital_keys: keys,
    count: keys.length,
  })
}

