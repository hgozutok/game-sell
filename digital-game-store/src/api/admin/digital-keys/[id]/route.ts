import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { z } from "zod"
import KeyInventoryService from "../../../../modules/key-inventory/service"

// Disable authentication for development
export const AUTHENTICATE = false

// GET /admin/digital-keys/:id - Get a specific digital key
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const keyInventoryService = req.scope.resolve("keyInventory") as KeyInventoryService
  const { id } = req.params

  const key = await keyInventoryService.retrieveDigitalKey(id)

  if (!key) {
    return res.status(404).json({ message: "Digital key not found" })
  }

  res.json({ digital_key: key })
}

const UpdateKeySchema = z.object({
  status: z.enum(["available", "assigned", "delivered", "revoked"]).optional(),
  metadata: z.record(z.any()).optional(),
})

// POST /admin/digital-keys/:id - Update a digital key
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const keyInventoryService = req.scope.resolve("keyInventory") as KeyInventoryService
  const { id } = req.params

  const validated = UpdateKeySchema.parse(req.body)

  const [updatedKey] = await keyInventoryService.updateDigitalKeys([
    {
      id,
      ...validated,
    },
  ])

  res.json({ digital_key: updatedKey })
}

// DELETE /admin/digital-keys/:id - Revoke a digital key
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const keyInventoryService = req.scope.resolve("keyInventory") as KeyInventoryService
  const { id } = req.params

  const revokedKey = await keyInventoryService.revokeKey(id)

  res.json({
    message: "Digital key revoked successfully",
    digital_key: revokedKey,
  })
}

