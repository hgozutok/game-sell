import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

// GET /admin/test-links - Test endpoint to check remoteLink functionality
export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any

    // Get first collection
    const collections = await productModule.listProductCollections({}, { take: 1 })
    if (!collections || collections.length === 0) {
      return res.json({ error: 'No collections found' })
    }

    const testCollection = collections[0]
    
    // Try different methods to query links
    let listResult
    let queryMethods = []
    
    // Method 1: Standard query
    try {
      listResult = await remoteLink.list({
        product_collection: { product_collection_id: testCollection.id }
      })
      queryMethods.push({ method: 'product_collection with product_collection_id', success: true, count: listResult?.length || 0 })
    } catch (e: any) {
      queryMethods.push({ method: 'product_collection with product_collection_id', success: false, error: e.message })
    }
    
    // Method 2: Try with just collection_id
    let listResult2
    try {
      listResult2 = await remoteLink.list({
        collection_id: testCollection.id
      })
      queryMethods.push({ method: 'collection_id', success: true, count: listResult2?.length || 0 })
    } catch (e: any) {
      queryMethods.push({ method: 'collection_id', success: false, error: e.message })
    }
    
    // Method 3: Try with Modules.PRODUCT
    let listResult3
    try {
      listResult3 = await remoteLink.list({
        [Modules.PRODUCT]: { product_collection_id: testCollection.id }
      })
      queryMethods.push({ method: 'Modules.PRODUCT with product_collection_id', success: true, count: listResult3?.length || 0 })
    } catch (e: any) {
      queryMethods.push({ method: 'Modules.PRODUCT with product_collection_id', success: false, error: e.message })
    }
    
    // Try to list ALL links (to understand structure)
    let allLinks
    try {
      allLinks = await remoteLink.list({})
      queryMethods.push({ method: 'list all', success: true, total_count: allLinks?.length || 0 })
    } catch (e: any) {
      queryMethods.push({ method: 'list all', success: false, error: e.message })
    }

    res.json({
      success: true,
      collection: {
        id: testCollection.id,
        title: testCollection.title,
      },
      query_methods: queryMethods,
      link_count: listResult?.length || 0,
      links_sample: listResult?.slice(0, 2) || [],
      link_structure: listResult && listResult.length > 0 ? Object.keys(listResult[0]) : null,
      all_links_sample: allLinks?.slice(0, 3) || [],
      all_links_structure: allLinks && allLinks.length > 0 ? Object.keys(allLinks[0]) : null,
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack })
  }
}

