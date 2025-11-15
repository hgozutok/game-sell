import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { getCurrencyRates } from '../../../../../utils/currency'
import { buildDisplayPrice } from '../../../../../utils/pricing'

// Disable authentication for development
export const AUTHENTICATE = false

// GET /store/collections/[id]/products - Get products in a collection
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT) as any
    const { id } = req.params
    const { hideZeroPrice = 'false', hideZeroStock = 'false', limit = 50 } = req.query
    const storeSettings = req.scope.resolve('storeSettings') as any
    const currencyRates = await getCurrencyRates(storeSettings)
    const defaultCurrency = await storeSettings.getSettingValue('currencies.default', 'usd')
    const displayCurrency = await storeSettings.getSettingValue('store.display_currency', defaultCurrency)
    const taxRateSetting = await storeSettings.getSettingValue('tax.rate', 20)
    const taxRate = typeof taxRateSetting === 'number' ? taxRateSetting : parseFloat(taxRateSetting) || 0

    console.log(`[Collection Products] Fetching products for collection: ${id}`)
    console.log(`[Collection Products] Filters: hideZeroPrice=${hideZeroPrice}, hideZeroStock=${hideZeroStock}`)

    // Fetch all products (without relations to avoid MikroORM issues)
    const allProducts = await productModuleService.listProducts({})

    console.log(`[Collection Products] Total products fetched: ${allProducts.length}`)

    // Filter products by collection
    let products = allProducts.filter((product: any) => {
      // Check both collection_id and collection_ids array
      if (product.collection_id === id) return true
      if (product.collection_ids && Array.isArray(product.collection_ids) && product.collection_ids.includes(id)) return true
      return false
    })

    console.log(`[Collection Products] Products in collection: ${products.length}`)

    // Debug: Check product structure
    if (products.length > 0) {
      const sample = products[0]
      console.log(`[Collection Products] Sample product:`, {
        id: sample.id,
        title: sample.title,
        hasVariants: !!sample.variants,
        variantCount: sample.variants?.length || 0,
        hasPrices: !!sample.variants?.[0]?.prices,
        priceCount: sample.variants?.[0]?.prices?.length || 0,
      })
    }

    // Apply price filter
    if (hideZeroPrice === 'true') {
      const beforeFilter = products.length
      products = products.filter((product: any) => {
        const price = product.variants?.[0]?.prices?.[0]?.amount || 0
        return price > 0
      })
      console.log(`[Collection Products] Price filter: ${beforeFilter} -> ${products.length} products`)
    }

    // Apply limit
    const limitNum = Number(limit)
    if (limitNum && limitNum > 0) {
      products = products.slice(0, limitNum)
    }

    console.log(`[Collection Products] Returning ${products.length} products`)

    const productsWithPricing = (products || []).map((product: any) => ({
      ...product,
      display_price: buildDisplayPrice(product, displayCurrency, currencyRates, taxRate),
    }))

    return res.json({
      products: productsWithPricing,
      count: productsWithPricing.length,
      currency: displayCurrency,
      tax_rate: taxRate,
    })
  } catch (error: any) {
    console.error('[Collection Products] Error:', error.message)
    console.error('[Collection Products] Stack:', error.stack)
    return res.status(500).json({
      products: [],
      count: 0,
      error: error.message,
    })
  }
}
