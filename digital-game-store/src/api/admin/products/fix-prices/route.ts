import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Fix missing prices for products
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const pricingModule = req.scope.resolve(Modules.PRICING) as any
    const logger = req.scope.resolve('logger') as any

    logger.info('💰 Fixing prices for products...')

    // Get all products
    const products = await productModule.listProducts({}, { take: 1000 })
    logger.info(`📦 Found ${products.length} products`)

    let fixedCount = 0

    const remoteLink = req.scope.resolve('remoteLink') as any

    for (const product of products) {
      try {
        // Get variants for this product
        const variants = await productModule.listProductVariants({ 
          product_id: product.id 
        })

        for (const variant of variants) {
          // Get base price from metadata
          const basePrice = parseFloat(product.metadata?.original_price || '0')
          if (basePrice <= 0) {
            logger.warn(`⏭️ Skipping ${product.title} - no original_price in metadata`)
            continue
          }

          // Calculate price with margin
          const margin = parseFloat(product.metadata?.margin_applied || '15')
          const finalPrice = Math.round(basePrice * (1 + margin / 100) * 100) // cents

          // Create price set
          const priceSet = await pricingModule.createPriceSets({
            prices: [{
              amount: finalPrice,
              currency_code: 'usd',
              rules: {},
            }],
          })

          // Link variant to price set
          await remoteLink.create({
            [Modules.PRODUCT]: {
              variant_id: variant.id,
            },
            [Modules.PRICING]: {
              price_set_id: priceSet.id,
            },
          })

          fixedCount++
          logger.info(`✅ Fixed price for: ${product.title} - $${(finalPrice / 100).toFixed(2)}`)
        }
      } catch (error: any) {
        logger.error(`❌ Failed to fix ${product.title}:`, error.message)
      }
    }

    logger.info(`🎉 Completed! Fixed ${fixedCount} variants`)

    res.json({
      message: `Successfully fixed prices for ${fixedCount} products`,
      fixed_count: fixedCount,
      total_products: products.length,
    })
  } catch (error: any) {
    console.error('Fix prices error:', error)
    res.status(500).json({
      message: 'Failed to fix prices',
      error: error.message,
      details: error.stack,
    })
  }
}

