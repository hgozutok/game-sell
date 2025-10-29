import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from "@medusajs/framework/utils"

// GET /store/collections/[id] - Get collection by ID
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT) as any
    const { id } = req.params

    const collection = await productModuleService.retrieveProductCollection(id)

    res.json({
      collection
    })
  } catch (error: any) {
    console.error('Failed to fetch collection:', error)
    res.status(404).json({ 
      message: 'Collection not found',
      error: error.message 
    })
  }
}
