import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import KeyInventoryService from "../../../../../modules/key-inventory/service"

// GET /store/customers/me/digital-keys - Get customer's digital keys
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const keyInventoryService = req.scope.resolve("keyInventory") as KeyInventoryService
  
  // Get authenticated customer ID from request
  const customerId = (req as any).auth?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const keys = await keyInventoryService.getKeysByCustomer(customerId)

  res.json({
    digital_keys: keys,
    count: keys.length,
  })
}

