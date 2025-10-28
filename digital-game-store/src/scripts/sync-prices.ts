export default async function ({ container }: any) {
  const productModuleService = container.resolve("product")
  const logger = container.resolve("logger")

  logger.info("💰 Syncing prices for all products...")

  // Get all products
  const products = await productModuleService.listProducts({}, { take: 1000 })
  logger.info(`📦 Found ${products.length} products`)

  let updatedCount = 0

  for (const product of products) {
    try {
      // Get variants for this product
      const variants = await productModuleService.listProductVariants({ 
        product_id: product.id 
      })

      if (!variants || variants.length === 0) {
        logger.warn(`⚠️ No variants for: ${product.title}`)
        continue
      }

      for (const variant of variants) {
        // Calculate price from metadata
        const originalPrice = product.metadata?.original_price || 0
        const margin = product.metadata?.margin_applied || 15
        
        let finalPrice = 4999 // Default $49.99
        
        if (originalPrice > 0) {
          // Calculate with margin
          const marginAmount = originalPrice * (margin / 100)
          finalPrice = Math.round((originalPrice + marginAmount) * 100) // Convert to cents
        } else {
          // Random price between $19.99 and $69.99
          finalPrice = Math.floor(Math.random() * 5000) + 1999
        }

        // Update variant with price
        await productModuleService.updateProductVariants([{
          id: variant.id,
          prices: [{
            amount: finalPrice,
            currency_code: 'usd',
          }],
        }])

        updatedCount++
        
        if (updatedCount % 50 === 0) {
          logger.info(`📊 Progress: ${updatedCount} variants updated...`)
        }
      }
    } catch (error: any) {
      logger.error(`❌ Failed for ${product.title}:`, error.message)
    }
  }

  logger.info(`🎉 Completed! Updated ${updatedCount} variants with prices`)
}

