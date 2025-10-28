import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Search products from external providers (CWS or Kinguin)
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { provider, query } = req.query as { provider: string; query: string }

    if (!provider || !query) {
      return res.status(400).json({
        message: 'Missing required parameters: provider and query',
      })
    }

    if (provider !== 'codeswholesale' && provider !== 'kinguin') {
      return res.status(400).json({
        message: 'Invalid provider. Must be "codeswholesale" or "kinguin"',
      })
    }

    // Get the appropriate provider service
    const providerModuleName = provider === 'codeswholesale' ? 'codesWholesale' : 'kinguin'
    const providerService = req.scope.resolve(providerModuleName) as any

    // Search products
    const products = await providerService.searchProducts(query)

    res.json({
      provider,
      query,
      products: products || [],
      count: products?.length || 0,
    })
  } catch (error: any) {
    console.error('Product search error:', error)
    res.status(500).json({
      message: 'Failed to search products',
      error: error.message,
      details: error.stack,
    })
  }
}

