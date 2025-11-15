import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'
import { getCurrencyRates, convertCurrencyAmount } from '../../../../utils/currency'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Update prices for all products from CodesWholesale API
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { provider = 'codeswholesale', margin_percentage = 15 } = req.body as any
    
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const providerModuleName = provider === 'codeswholesale' ? 'codesWholesale' : 'kinguin'
    const providerService = req.scope.resolve(providerModuleName) as any
    const logger = req.scope.resolve('logger') as any
    const storeSettings = req.scope.resolve('storeSettings') as any

    const currencyRates = await getCurrencyRates(storeSettings)
    const providerCurrencyKey = provider === 'kinguin'
      ? 'provider.currency.kinguin'
      : 'provider.currency.codeswholesale'
    const providerCurrency = await storeSettings.getSettingValue(
      providerCurrencyKey,
      provider === 'kinguin' ? 'eur' : 'usd'
    )

    logger.info('💰 Updating prices from provider...')

    // Get all products from provider
    const products = await productModule.listProducts({
      metadata: { provider }
    }, { take: 1000 })

    logger.info(`📦 Found ${products.length} products to update`)

    let updatedCount = 0

    for (const product of products) {
      try {
        const providerProductId = product.metadata?.provider_product_id
        if (!providerProductId) {
          continue
        }

        // Get current price from provider
        const providerProduct = await providerService.getProductInfo(providerProductId)
        
        if (!providerProduct || !providerProduct.price) {
          logger.warn(`⚠️ No price from provider for: ${product.title}`)
          continue
        }

        const basePrice = providerProduct.price
        const margin = margin_percentage
        const marginAmount = basePrice * (margin / 100)
        const providerPriceWithMargin = basePrice + marginAmount
        const providerPriceMinor = Math.round(providerPriceWithMargin * 100)
        let finalPrice = providerPriceMinor
        try {
          finalPrice = convertCurrencyAmount(providerPriceMinor, providerCurrency, 'usd', currencyRates)
        } catch (conversionError: any) {
          logger.warn(`⚠️ Currency conversion failed for ${product.title}:`, conversionError.message)
        }

        // Get variants for this product
        const variants = await productModule.listProductVariants({ 
          product_id: product.id 
        })

        if (!variants || variants.length === 0) {
          logger.warn(`⚠️ No variants for: ${product.title}`)
          continue
        }

        // Update each variant's price
        for (const variant of variants) {
          // Update variant with price directly in the variant data
          await productModule.updateProductVariants([{
            id: variant.id,
            prices: [{
              amount: finalPrice,
              currency_code: 'usd',
            }],
          }])

          updatedCount++
          logger.info(`✅ Updated: ${product.title} - $${(finalPrice / 100).toFixed(2)} (was $${basePrice.toFixed(2)})`)
        }

        // Update metadata with new price info
        await productModule.updateProducts([{
          id: product.id,
          metadata: {
            ...product.metadata,
            original_price: basePrice,
            provider_currency: providerCurrency,
            last_price_update: new Date().toISOString(),
          },
        }])

      } catch (error: any) {
        logger.error(`❌ Failed to update ${product.title}:`, error.message)
      }

      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    logger.info(`🎉 Completed! Updated ${updatedCount} variants`)

    res.json({
      message: `Successfully updated prices for ${updatedCount} products`,
      updated_count: updatedCount,
      total_products: products.length,
    })
  } catch (error: any) {
    console.error('Update prices error:', error)
    res.status(500).json({
      message: 'Failed to update prices',
      error: error.message,
      details: error.stack,
    })
  }
}

