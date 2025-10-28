import { Modules } from "@medusajs/framework/utils"

export default async function ({ container }: any) {
  const productModule = container.resolve(Modules.PRODUCT)
  const logger = container.resolve("logger")

  logger.info("💰 Adding prices to products without prices...")

  // Get all products
  const products = await productModule.listProducts({}, { take: 1000 })
  logger.info(`📦 Found ${products.length} products`)

  let updatedCount = 0

  for (const product of products) {
    try {
      // Get variants for this product
      const variants = await productModule.listProductVariants({ product_id: product.id })

      if (!variants || variants.length === 0) {
        logger.warn(`⚠️ No variants for ${product.title}, skipping...`)
        continue
      }

      for (const variant of variants) {
        // Check if variant already has prices
        const existingPrices = await productModule.listProductVariantPrices({ variant_id: variant.id })
        
        if (existingPrices && existingPrices.length > 0) {
          // Already has prices, skip
          continue
        }

        // Generate a price based on metadata or random
        const originalPrice = product.metadata?.original_price || 0
        const margin = product.metadata?.margin_applied || 15
        
        let finalPrice = 4999 // Default $49.99
        
        if (originalPrice > 0) {
          // Calculate with margin
          const marginAmount = originalPrice * (margin / 100)
          finalPrice = Math.round(originalPrice + marginAmount)
        } else {
          // Random price between $9.99 and $79.99
          finalPrice = Math.floor(Math.random() * 7000) + 999
        }

        // Create price for this variant
        await productModule.createProductVariantPrices({
          variant_id: variant.id,
          amount: finalPrice,
          currency_code: 'usd',
        })

        updatedCount++
        logger.info(`✅ Added price to: ${product.title} - $${(finalPrice / 100).toFixed(2)}`)
      }
    } catch (error: any) {
      logger.error(`❌ Failed to add price to ${product.title}:`, error.message)
    }
  }

  logger.info(`🎉 Completed! Added prices to ${updatedCount} variants`)
}

