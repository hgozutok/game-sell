import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { z } from "zod"
import KeyInventoryService from "../../../modules/key-inventory/service"

// GET /admin/digital-keys - List all digital keys
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const keyInventoryService = req.scope.resolve("keyInventory") as KeyInventoryService

  const { product_id, status, limit = 50, offset = 0 } = req.query

  const filters: any = {}
  
  if (product_id) {
    filters.product_id = product_id
  }
  
  if (status) {
    filters.status = status
  }

  const keys = await keyInventoryService.listDigitalKeys({
    filters,
    skip: Number(offset),
    take: Number(limit),
  })

  const count = keys.length

  res.json({
    digital_keys: keys,
    count,
    limit: Number(limit),
    offset: Number(offset),
  })
}

const BulkImportSchema = z.object({
  keys: z.array(
    z.object({
      key_code: z.string(),
      product_id: z.string(),
      variant_id: z.string().optional(),
      provider: z.enum(["codesWholesale", "kinguin", "manual"]).optional(),
      sku: z.string().optional(),
      platform: z.string().optional(),
      region: z.string().optional(),
      metadata: z.any().optional(),
    })
  ),
})

// POST /admin/digital-keys/bulk-import - Bulk import keys
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const keyInventoryService = req.scope.resolve("keyInventory") as KeyInventoryService

  const validated = BulkImportSchema.parse(req.body)

  const importedKeys = await keyInventoryService.bulkImportKeys(validated.keys as Array<{
    key_code: string
    product_id: string
    variant_id?: string
    provider?: "codesWholesale" | "kinguin" | "manual"
    sku?: string
    platform?: string
    region?: string
    metadata?: any
  }>)

  res.json({
    message: `Successfully imported ${importedKeys.length} keys`,
    digital_keys: importedKeys,
  })
}

