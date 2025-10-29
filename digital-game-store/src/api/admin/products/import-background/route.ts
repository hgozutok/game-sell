import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getCurrencyRates, calculateMultiCurrencyPrices } from '../../../../utils/currency'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Start background import job
 * Returns immediately with job ID, import continues in background
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { provider, margin_percentage, max_products = 100 } = req.body as any

    if (!provider) {
      return res.status(400).json({
        message: 'Missing required field: provider',
      })
    }

    if (provider !== 'codeswholesale' && provider !== 'kinguin') {
      return res.status(400).json({
        message: 'Invalid provider. Must be "codeswholesale" or "kinguin"',
      })
    }

    const logger = req.scope.resolve('logger') as any
    const backgroundJobs = req.scope.resolve('backgroundJobs') as any

    // Create background job
    const job = await backgroundJobs.createJob({
      type: 'product_import',
      metadata: {
        provider,
        margin_percentage: margin_percentage || 15,
        max_products,
      },
    })

    logger.info(`🚀 Background import job created: ${job.id}`)

    // Start import in background (don't await!)
    runImportInBackground(req.scope, job.id, provider, margin_percentage, max_products).catch((error) => {
      logger.error(`Background import failed for job ${job.id}:`, error)
    })

    // Return immediately
    res.status(202).json({
      message: 'Import started in background',
      job_id: job.id,
      status: 'running',
    })
  } catch (error: any) {
    console.error('Background import error:', error)
    res.status(500).json({
      message: 'Failed to start background import',
      error: error.message,
    })
  }
}

/**
 * Run import process in background
 */
async function runImportInBackground(
  scope: any,
  jobId: string,
  provider: string,
  margin_percentage: number | undefined,
  max_products: number
) {
  const logger = scope.resolve('logger') as any
  const backgroundJobs = scope.resolve('backgroundJobs') as any
  const providerModuleName = provider === 'codeswholesale' ? 'codesWholesale' : 'kinguin'
  const providerService = scope.resolve(providerModuleName) as any
  const productModule = scope.resolve('product') as any
  const pricingModule = scope.resolve(Modules.PRICING) as any
  const salesChannelModule = scope.resolve(Modules.SALES_CHANNEL) as any
  const remoteLink = scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any
  const storeSettings = scope.resolve('storeSettings') as any

  try {
    // Update job to running
    await backgroundJobs.updateBackgroundJobs({
      id: jobId,
      status: 'running',
    })

    logger.info(`🚀 Starting background import for job ${jobId}`)

    // Get currency rates and sales channel
    const currencyRates = await getCurrencyRates(storeSettings)
    const salesChannels = await salesChannelModule.listSalesChannels({ name: 'Default Sales Channel' })
    const defaultChannel = salesChannels?.[0]

    // Fetch products from provider
    const availableProducts = await providerService.listAllProducts(max_products)

    if (!availableProducts || availableProducts.length === 0) {
      await backgroundJobs.completeJob(jobId, { message: 'No products available', imported_count: 0 })
      return
    }

    await backgroundJobs.updateJobProgress(jobId, 5, 0, availableProducts.length)

    const importedProducts = []
    let processed = 0
    let batchCount = 0

    // Import each product
    for (const externalProduct of availableProducts) {
      try {
        // Debug first product
        if (processed === 0) {
          logger.info(`🔍 First product data:`)
          logger.info(`  Name: ${externalProduct.name}`)
          logger.info(`  Price: ${externalProduct.price}`)
          logger.info(`  Qty: ${externalProduct.qty}`)
          logger.info(`  ProductId: ${externalProduct.productId}`)
          logger.info(`  Full object keys:`, Object.keys(externalProduct))
        }

        // Skip if no stock
        const stock = externalProduct.quantity || externalProduct.qty || 0
        if (stock <= 0) {
          logger.info(`⏭️ Skipping ${externalProduct.name} - out of stock (${stock})`)
          processed++
          continue
        }

        // Skip full product info for CodesWholesale to reduce API calls
        // Use basic info from list (has everything we need)
        const productData = externalProduct

        const basePrice = parseFloat(externalProduct.price) || parseFloat(productData.price) || 0
        if (basePrice <= 0) {
          logger.info(`⏭️ Skipping ${externalProduct.name} - invalid price (${basePrice})`)
          processed++
          continue
        }

        const margin = margin_percentage !== undefined ? margin_percentage : 15
        const finalPrice = Math.round((basePrice + (basePrice * margin / 100)) * 100)

        const productName = productData.name || 'Imported Product'
        
        // Generate unique handle with provider prefix
        const providerPrefix = provider === 'kinguin' ? 'kinguin-' : 'cws-'
        const handle = (providerPrefix + productName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''))
          .substring(0, 100)

        // Thumbnail handling (provider-specific)
        const thumbnailUrl = provider === 'kinguin'
          ? (productData.image || externalProduct.image || 'https://placehold.co/600x400/1a1d24/ff6b35?text=No+Image')
          : `https://api.codeswholesale.com/v1/products/${productData.productId}/image?format=MEDIUM`

        // Check if exists - UPDATE instead of skip
        const existingProducts = await productModule.listProducts({ handle })
        let productToUse
        
        if (existingProducts && existingProducts.length > 0) {
          // UPDATE existing product
          const existingProduct = existingProducts[0]
          if (processed < 3) {
            logger.info(`🔄 Updating ${productName} (handle: ${handle})`)
          }
          
          await productModule.updateProducts(existingProduct.id, {
            title: productName.substring(0, 255),
            thumbnail: thumbnailUrl,
            images: [{ url: thumbnailUrl }],
            metadata: {
              provider: provider,
              provider_product_id: productData.productId,
              platform: productData.platform || 'PC',
              region: productData.region || 'GLOBAL',
              original_price: basePrice,
              margin_applied: margin,
              imported_at: new Date().toISOString(),
            },
          })
          
          productToUse = existingProduct
        } else {
          // CREATE new product
          if (importedProducts.length === 0) {
            logger.info(`✨ Attempting first import: ${productName}`)
            logger.info(`  Handle: ${handle}`)
            logger.info(`  Thumbnail: ${thumbnailUrl}`)
            logger.info(`  Base Price: $${basePrice}`)
            logger.info(`  Final Price: $${(finalPrice / 100).toFixed(2)}`)
          }
          
          productToUse = await productModule.createProducts({
            title: productName.substring(0, 255),
            handle,
            status: 'published',
            description: productData.description || `${productName} - Digital game key delivered instantly`,
            thumbnail: thumbnailUrl,
            images: [{ url: thumbnailUrl }],
            metadata: {
              provider,
              provider_product_id: productData.productId,
              platform: productData.platform || 'PC',
              region: productData.region || 'GLOBAL',
              original_price: basePrice,
              margin_applied: margin,
              imported_at: new Date().toISOString(),
            },
          })
        }

        // Create/Update variant with multi-currency pricing
        if (productToUse?.id) {
          const variantSku = `${provider.toUpperCase()}-${productData.productId}`.substring(0, 100)
          const multiCurrencyPrices = calculateMultiCurrencyPrices(finalPrice, currencyRates)
          
          // Check if variant with this SKU already exists
          const existingVariants = await productModule.listProductVariants({ sku: variantSku })
          
          let variant
          
          if (existingVariants && existingVariants.length > 0) {
            // Variant already exists - skip price update (complex operation)
            variant = existingVariants[0]
            if (importedProducts.length < 3) {
              logger.info(`ℹ️ Variant exists for ${productName}, product metadata updated`)
            }
          } else {
            // CREATE new variant
            const priceSet = await pricingModule.createPriceSets({ prices: multiCurrencyPrices })
            const variants = await productModule.createProductVariants([{
              product_id: productToUse.id,
              title: 'Standard Edition',
              sku: variantSku,
              manage_inventory: false,
            }])

            variant = variants[0]

            await remoteLink.create([{
              [Modules.PRODUCT]: { variant_id: variant.id },
              [Modules.PRICING]: { price_set_id: priceSet.id },
            }])
          }

          // Link to sales channel
          if (defaultChannel) {
            try {
              await remoteLink.create([{
                [Modules.PRODUCT]: { product_id: productToUse.id },
                [Modules.SALES_CHANNEL]: { sales_channel_id: defaultChannel.id },
              }])
            } catch (linkError) {
              // Ignore link errors
            }
          }

          importedProducts.push(productToUse)
        }

        processed++

        // Update progress every 10 items
        if (processed % 10 === 0) {
          const progress = Math.round((processed / availableProducts.length) * 100)
          await backgroundJobs.updateJobProgress(jobId, progress, processed, availableProducts.length)
          logger.info(`📊 Progress: ${processed}/${availableProducts.length} (${progress}%)`)
        }

        // Extra delay every 50 items to prevent rate limiting
        if (processed % 50 === 0) {
          logger.info(`⏸️ Brief pause to respect API rate limits...`)
          await new Promise(resolve => setTimeout(resolve, 5000)) // 5 second pause
        }

      } catch (error: any) {
        logger.error(`Failed to import ${externalProduct.name}:`, error.message)
        processed++
      }

      // Delay to prevent rate limiting (200ms - reduced since we removed getFullProductInfo)
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Complete job
    await backgroundJobs.completeJob(jobId, {
      message: `Successfully imported ${importedProducts.length} products`,
      imported_count: importedProducts.length,
      total_attempted: processed,
    })

    logger.info(`🎉 Background import completed: ${importedProducts.length}/${processed} products`)

  } catch (error: any) {
    logger.error(`Background import job ${jobId} failed:`, error)
    await backgroundJobs.failJob(jobId, error.message)
  }
}

