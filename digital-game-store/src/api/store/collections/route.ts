import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from "@medusajs/framework/utils"

// Disable authentication for development
export const AUTHENTICATE = false

// GET /store/collections - List all collections
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Basic CORS for storefront
    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-publishable-api-key')
    }
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

// Preflight for CORS
export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-publishable-api-key')
  }
  res.status(204).end()
}
