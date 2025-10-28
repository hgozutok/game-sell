import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

/**
 * Search and filter products
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productModuleService = req.scope.resolve('productModuleService') as any

  const {
    q, // search query
    platform,
    region,
    genre,
    category_id,
    min_price,
    max_price,
    sort_by,
    order,
    limit = 50,
    offset = 0,
  } = req.query

  try {
    // Build filters
    const filters: any = {}

    // Text search
    if (q) {
      filters.$or = [
        { title: { $ilike: `%${q}%` } },
        { description: { $ilike: `%${q}%` } },
      ]
    }

    // Metadata filters
    if (platform || region || genre) {
      filters.metadata = {}
      if (platform) filters.metadata.platform = platform
      if (region) filters.metadata.region = region
      if (genre) filters.metadata.genre = genre
    }

    // Category filter
    if (category_id) {
      filters.categories = { id: category_id }
    }

    // Fetch products
    const [products, count] = await productModuleService.listAndCount(
      filters,
      {
        relations: ['variants', 'variants.prices', 'images', 'categories'],
        skip: parseInt(offset as string),
        take: parseInt(limit as string),
        order: sort_by === 'name'
          ? { title: order === 'desc' ? 'DESC' : 'ASC' }
          : sort_by === 'price'
          ? { 'variants.prices.amount': order === 'desc' ? 'DESC' : 'ASC' }
          : sort_by === 'created_at'
          ? { created_at: order === 'desc' ? 'DESC' : 'ASC' }
          : { created_at: 'DESC' },
      }
    )

    // Filter by price if needed (post-query since price is in variants)
    let filteredProducts = products
    if (min_price || max_price) {
      filteredProducts = products.filter((product) => {
        if (!product.variants || product.variants.length === 0) return false
        const price = product.variants[0]?.calculated_price?.calculated_amount || product.variants[0]?.prices?.[0]?.amount || 0
        
        if (min_price && price < parseInt(min_price as string)) return false
        if (max_price && price > parseInt(max_price as string)) return false
        
        return true
      })
    }

    res.json({
      products: filteredProducts,
      count: filteredProducts.length,
      total: count,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    })
  } catch (error: any) {
    console.error('Product search error:', error)
    res.status(500).json({
      message: 'Failed to search products',
      error: error.message,
    })
  }
}

