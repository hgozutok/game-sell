import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from "@medusajs/framework/utils"

// GET /store/collections - List all collections
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT) as any

    // Get all collections - listProductCollections accepts a filter object
    const collections = await productModuleService.listProductCollections({})

    // If no collections found, return empty array
    const collectionsArray = collections || []

    res.json({
      collections: collectionsArray,
      count: collectionsArray.length,
    })
  } catch (error: any) {
    console.error('Failed to fetch collections:', error)
    // Return empty array instead of error for public endpoint
    res.json({
      collections: [],
      count: 0,
    })
  }
}
