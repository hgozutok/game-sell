import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from "@medusajs/framework/utils"

// GET /store/collections/[id]/products - Get products in a collection
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT) as any
    const { id } = req.params

    // Get products in this collection
    // listProducts accepts a filter object with collection_id
    const products = await productModuleService.listProducts({
      collection_id: id,
    })

    // If no products found, return empty array
    const productsArray = products || []

    res.json({
      products: productsArray,
      count: productsArray.length,
    })
  } catch (error: any) {
    console.error('Failed to fetch collection products:', error)
    // Return empty array instead of error for public endpoint
    res.json({
      products: [],
      count: 0,
    })
  }
}
