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
    const { skip = 0, take = 50, hideZeroPrice = 'false', hideZeroStock = 'false', collection_id } = req.query

    console.log('Fetching products with pagination:', { skip, take, hideZeroPrice, hideZeroStock, collection_id })

    // Get all products (without relations to avoid MikroORM issues)
    const allProducts = await productModule.listProducts({})

    console.log(`[Admin Products] Total products fetched: ${allProducts.length}`)
    if (allProducts.length > 0) {
      console.log(`[Admin Products] Sample product has variants: ${allProducts[0].variants ? 'yes' : 'no'}`)
      if (allProducts[0].variants && allProducts[0].variants.length > 0) {
        console.log(`[Admin Products] First variant has prices: ${allProducts[0].variants[0].prices ? 'yes' : 'no'}`)
      }
    }

    // Apply filters
    let filteredProducts = allProducts

    // Filter by collection
    if (collection_id) {
      filteredProducts = filteredProducts.filter((product: any) => {
        if (product.collection_id === collection_id) return true
        if (product.collection_ids && Array.isArray(product.collection_ids) && product.collection_ids.includes(collection_id)) return true
        return false
      })
      console.log(`[Admin Products] Collection filter: ${allProducts.length} -> ${filteredProducts.length} products`)
    }

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


