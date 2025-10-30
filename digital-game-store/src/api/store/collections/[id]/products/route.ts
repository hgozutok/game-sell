import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/collections/[id]/products - Get products in a collection
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT) as any
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any
    const { id } = req.params

    console.log(`[Collection Products] Fetching products for collection: ${id}`)

    try {
      // Method 1: Try to query using remoteLink relations
      console.log(`[Collection Products] Attempting remoteLink query for collection:`, id)
      
      // Get all relations to find products linked to this collection
      const allLinks = await remoteLink.list({})
      console.log(`[Collection Products] Total links found: ${allLinks?.length || 0}`)
      
      // Filter links for this collection
      const links = allLinks?.filter((link: any) => {
        // Check various possible structures
        return link.product_collection?.id === id || 
               link.product_collection?.product_collection_id === id ||
               link.collection_id === id
      }) || []

      console.log(`[Collection Products] Found ${links.length} links for this collection`)

      if (links && links.length > 0) {
        // Extract product IDs from links (try different possible structures)
        const productIds = links
          .map((link: any) => {
            return link[Modules.PRODUCT]?.product_id || 
                   link.product?.id ||
                   link.product_id ||
                   link.product?.product_id
          })
          .filter((pid: any) => pid)

        console.log(`[Collection Products] Extracted ${productIds.length} product IDs from links`)
        console.log(`[Collection Products] Sample link structure:`, links[0])

        // Fetch products by IDs
        const products = []
        for (const productId of productIds) {
          try {
            const product = await productModuleService.retrieveProduct(productId)
            if (product) {
              products.push(product)
            }
          } catch (err) {
            console.log(`[Collection Products] Could not retrieve product ${productId}`)
          }
        }

        console.log(`[Collection Products] Retrieved ${products.length} products via remoteLink`)

        return res.json({
          products: products,
          count: products.length,
        })
      }
    } catch (linkError: any) {
      console.log(`[Collection Products] RemoteLink query failed: ${linkError.message}`)
    }

    // Method 2: Fallback - Fetch all products and filter
    console.log('[Collection Products] Using fallback method')
    const allProducts = await productModuleService.listProducts()
    console.log(`[Collection Products] Total products found: ${allProducts.length}`)

    // Debug: Log first product structure
    if (allProducts.length > 0) {
      const sampleProduct = allProducts[0]
      console.log('[Collection Products] Sample product keys:', Object.keys(sampleProduct))
      console.log('[Collection Products] Sample product:', {
        id: sampleProduct.id,
        title: sampleProduct.title,
        collection_id: sampleProduct.collection_id,
        collection_ids: sampleProduct.collection_ids,
      })
    }

    // Try filtering by various methods
    const products = allProducts.filter((product: any) => {
      if (product.collection_id === id) return true
      if (product.collection_ids && Array.isArray(product.collection_ids) && product.collection_ids.includes(id)) return true
      return false
    })

    console.log(`[Collection Products] Final filtered products: ${products.length}`)

    res.json({
      products: products || [],
      count: products?.length || 0,
    })
  } catch (error: any) {
    console.error('Failed to fetch collection products:', error)
    res.json({
      products: [],
      count: 0,
    })
  }
}
