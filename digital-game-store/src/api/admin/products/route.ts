import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { Modules } from '@medusajs/framework/utils'
import KeyInventoryService from '../../../modules/key-inventory/service'

// Disable authentication for development
export const AUTHENTICATE = false

// GET /admin/products - List all products with filtering and pagination
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const keyInventoryService = req.scope.resolve('keyInventory') as KeyInventoryService
    const { skip = 0, take = 50, hideZeroPrice = 'false', hideZeroStock = 'false' } = req.query

    console.log('Fetching products with pagination:', { skip, take, hideZeroPrice, hideZeroStock })

    // Get all products without pagination for now to get count
    const allProducts = await productModule.listProducts({}, {
      relations: ['*'],
    })

    // Apply filters
    let filteredProducts = allProducts

    // Filter by price
    if (hideZeroPrice === 'true') {
      filteredProducts = filteredProducts.filter((product: any) => {
        const price = product.variants?.[0]?.prices?.[0]?.amount || 0
        return price > 0
      })
    }

    // Filter by stock (digital keys)
    if (hideZeroStock === 'true') {
      const productsWithStock = await Promise.all(
        filteredProducts.map(async (product: any) => {
          const stockCount = await keyInventoryService.getInventoryCount(product.id)
          return { product, stockCount }
        })
      )
      
      filteredProducts = productsWithStock
        .filter(({ stockCount }) => stockCount > 0)
        .map(({ product }) => product)
    }

    const count = filteredProducts.length
    
    // Apply pagination manually
    const skipNum = Number(skip)
    const takeNum = Number(take)
    const products = filteredProducts.slice(skipNum, skipNum + takeNum)

    console.log(`Returning ${products.length} products out of ${count} total (after filters)`)

    res.json({
      products: products || [],
      count,
      limit: takeNum,
      offset: skipNum,
    })
  } catch (error: any) {
    console.error('Failed to fetch products:', error)
    res.status(500).json({
      message: 'Failed to fetch products',
      error: error.message,
    })
  }
}


