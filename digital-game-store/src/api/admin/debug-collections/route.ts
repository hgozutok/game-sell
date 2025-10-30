import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

// GET /admin/debug-collections - Debug endpoint to check products and collections
export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const logger = req.scope.resolve('logger')
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any
    
    console.log('Testing remoteLink methods...')

    // Get all collections
    const collections = await productModule.listProductCollections({})
    
    // Get all products (without relations to avoid MikroORM issues)
    const products = await productModule.listProducts({})
    
    // Check if there are any remote links at all
    let totalLinks = 0
    let linksSample = null
    try {
      // Try to access links via product module or remote query
      console.log('Attempting to check for remote links...')
      const testLinks = await remoteLink?.list?.({}) || []
      totalLinks = testLinks.length
      linksSample = testLinks.slice(0, 2)
    } catch (e: any) {
      console.warn('Could not query remote links:', e.message)
    }

    // Sample first product with full details
    let sampleProduct = null
    if (products && products.length > 0) {
      try {
        sampleProduct = await productModule.retrieveProduct(products[0].id)
      } catch (e) {
        sampleProduct = products[0]
      }
    }

    res.json({
      collections_count: collections?.length || 0,
      collections: collections?.map((c: any) => ({
        id: c.id,
        title: c.title,
        handle: c.handle,
      })) || [],
      products_count: products?.length || 0,
      sample_product_keys: sampleProduct ? Object.keys(sampleProduct) : [],
      sample_product: sampleProduct ? {
        id: sampleProduct.id,
        title: sampleProduct.title,
        collection_id: sampleProduct.collection_id,
        collection_ids: sampleProduct.collection_ids,
        collections: Array.isArray(sampleProduct.collections) 
          ? sampleProduct.collections.map((c: any) => ({ 
              id: typeof c === 'string' ? c : c.id, 
              title: typeof c === 'string' ? c : c.title 
            }))
          : sampleProduct.collections,
        full_sample: sampleProduct,
      } : null,
      // Check a few more products to see if any have collections
      products_with_collections: products?.filter((p: any) => p.collection_id || p.collection_ids).slice(0, 5).map((p: any) => ({
        id: p.id,
        title: p.title,
        collection_id: p.collection_id,
        collection_ids: p.collection_ids,
        platform: p.metadata?.platform,
      })) || [],
      total_products_with_collections: products?.filter((p: any) => p.collection_id || p.collection_ids).length || 0,
      // Check a specific updated product
      test_steam_product: products?.find((p: any) => p.title?.includes('Bloodstained')) || null,
      remote_links_info: {
        total_links: totalLinks,
        links_sample: linksSample,
        has_list_method: typeof remoteLink?.list === 'function',
        remote_link_methods: remoteLink ? Object.keys(remoteLink) : [],
      },
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack })
  }
}

