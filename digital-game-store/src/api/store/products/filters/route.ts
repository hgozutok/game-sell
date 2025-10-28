import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

/**
 * Get available filter options for products
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productModuleService = req.scope.resolve('productModuleService') as any

  try {
    // Get all products to extract unique metadata values
    const products = await productModuleService.list({}, {
      select: ['metadata'],
      take: 1000, // Reasonable limit
    })

    const platforms = new Set<string>()
    const regions = new Set<string>()
    const genres = new Set<string>()
    
    // Extract unique values from metadata
    for (const product of products) {
      if (product.metadata?.platform) platforms.add(product.metadata.platform as string)
      if (product.metadata?.region) regions.add(product.metadata.region as string)
      if (product.metadata?.genre) genres.add(product.metadata.genre as string)
    }

    // Get categories
    const categoryModuleService = req.scope.resolve('productCategoryModuleService') as any
    let categories: any[] = []
    
    try {
      categories = await categoryModuleService.list({}, {
        select: ['id', 'name', 'handle'],
        take: 100,
      })
    } catch (error) {
      // Categories might not be available yet
      console.log('Categories not available:', error)
    }

    res.json({
      filters: {
        platforms: Array.from(platforms).sort(),
        regions: Array.from(regions).sort(),
        genres: Array.from(genres).sort(),
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          handle: cat.handle,
        })),
      },
      sort_options: [
        { value: 'featured', label: 'Featured' },
        { value: 'price-asc', label: 'Price: Low to High' },
        { value: 'price-desc', label: 'Price: High to Low' },
        { value: 'name', label: 'Name: A to Z' },
        { value: 'created_at-desc', label: 'Newest First' },
      ],
    })
  } catch (error: any) {
    console.error('Failed to get filter options:', error)
    res.status(500).json({
      message: 'Failed to get filter options',
      error: error.message,
    })
  }
}

