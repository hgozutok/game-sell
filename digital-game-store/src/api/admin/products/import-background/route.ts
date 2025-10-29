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

    // Import each product
    for (const externalProduct of availableProducts) {
      try {
        // Skip if no stock
        if ((externalProduct.quantity || externalProduct.qty || 0) <= 0) {
          processed++
          continue
        }

        const fullProduct = await providerService.getFullProductInfo(externalProduct.productId)
        const productData = fullProduct || externalProduct

        const basePrice = parseFloat(externalProduct.price) || parseFloat(productData.price) || 0
        if (basePrice <= 0) {
          processed++
          continue
        }

        const margin = margin_percentage !== undefined ? margin_percentage : 15
        const finalPrice = Math.round((basePrice + (basePrice * margin / 100)) * 100)

        const productName = productData.name || 'Imported Product'
        const handle = productName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100)

        // Check if exists
        const existingProducts = await productModule.listProducts({ handle })
        if (existingProducts && existingProducts.length > 0) {
          processed++
          continue
        }

        const thumbnailUrl = `https://api.codeswholesale.com/v1/products/${productData.productId}/image?format=MEDIUM`

        // Create product
        const createdProduct = await productModule.createProducts({
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

        // Create variant with multi-currency pricing
        if (createdProduct?.id) {
          const multiCurrencyPrices = calculateMultiCurrencyPrices(finalPrice, currencyRates)
          const priceSet = await pricingModule.createPriceSets({ prices: multiCurrencyPrices })
          const variants = await productModule.createProductVariants([{
            product_id: createdProduct.id,
            title: 'Standard Edition',
            sku: `${provider.toUpperCase()}-${productData.productId}`.substring(0, 100),
            manage_inventory: false,
          }])

          await remoteLink.create({
            [Modules.PRODUCT]: { variant_id: variants[0].id },
            [Modules.PRICING]: { price_set_id: priceSet.id },
          })

          // Link to sales channel
          if (defaultChannel) {
            try {
              await remoteLink.create({
                [Modules.PRODUCT]: { product_id: createdProduct.id },
                [Modules.SALES_CHANNEL]: { sales_channel_id: defaultChannel.id },
              })
            } catch (linkError) {
              // Ignore link errors
            }
          }

          importedProducts.push(createdProduct)
        }

        processed++

        // Update progress every 10 items
        if (processed % 10 === 0) {
          const progress = Math.round((processed / availableProducts.length) * 100)
          await backgroundJobs.updateJobProgress(jobId, progress, processed, availableProducts.length)
          logger.info(`📊 Progress: ${processed}/${availableProducts.length} (${progress}%)`)
        }

      } catch (error: any) {
        logger.error(`Failed to import ${externalProduct.name}:`, error.message)
        processed++
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100))
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

