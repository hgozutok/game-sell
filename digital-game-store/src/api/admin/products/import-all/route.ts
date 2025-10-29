import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getCurrencyRates, calculateMultiCurrencyPrices } from '../../../../utils/currency'

export const AUTHENTICATE = false // Disable auth for development

/**
 * Import ALL in-stock products from a provider
 * WARNING: This can take a long time and import hundreds/thousands of products
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
    logger.info(`🚀 Starting bulk import from ${provider}`)

    // Get services
    const providerModuleName = provider === 'codeswholesale' ? 'codesWholesale' : 'kinguin'
    const providerService = req.scope.resolve(providerModuleName) as any
    const productModule = req.scope.resolve('product') as any // Use service name directly
    const pricingModule = req.scope.resolve(Modules.PRICING) as any
    const salesChannelModule = req.scope.resolve(Modules.SALES_CHANNEL) as any
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any
    const storeSettings = req.scope.resolve('storeSettings') as any
    
    // Get currency rates from settings
    const currencyRates = await getCurrencyRates(storeSettings)
    logger.info(`💱 Using currency rates:`, currencyRates)
    
    // Find default sales channel
    let defaultChannel = null
    try {
      const salesChannels = await salesChannelModule.listSalesChannels({ name: 'Default Sales Channel' })
      defaultChannel = salesChannels?.[0]
      
      if (!defaultChannel) {
        logger.warn('⚠️ Default Sales Channel not found, products will not be auto-linked')
      } else {
        logger.info(`✅ Found Default Sales Channel: ${defaultChannel.id}`)
      }
    } catch (channelError: any) {
      logger.warn('⚠️ Could not fetch sales channels:', channelError.message)
    }

    const importedProducts = []
    let totalAttempted = 0

    // Fetch all available products from provider
    logger.info('📦 Fetching product list from provider...')
    
    let availableProducts
    try {
      availableProducts = await providerService.listAllProducts(max_products)
    } catch (fetchError: any) {
      logger.error('❌ Failed to fetch products from provider:', fetchError.message)
      return res.status(500).json({
        message: 'Failed to fetch products from provider',
        error: fetchError.message,
        details: 'Check API credentials and provider service configuration',
      })
    }
    
    if (!availableProducts || availableProducts.length === 0) {
      logger.warn('⚠️ No products returned from provider')
      return res.status(200).json({
        message: 'No products available from provider at this time',
        imported_count: 0,
        total_attempted: 0,
        imported_products: [],
      })
    }

    logger.info(`📊 Found ${availableProducts.length} products, starting import...`)

    // Import each product
    for (const externalProduct of availableProducts) {
      totalAttempted++
      
      try {
        // Skip if no stock
        if ((externalProduct.quantity || externalProduct.qty || 0) <= 0) {
          logger.info(`⏭️ Skipping ${externalProduct.name} - out of stock`)
          continue
        }

        // Use basic info from list to reduce API calls and avoid rate limiting
        const productData = externalProduct

        // Calculate price with margin - use externalProduct.price (always available from list)
        const basePrice = parseFloat(externalProduct.price) || parseFloat(productData.price) || 0
        
        if (basePrice <= 0) {
          logger.warn(`⚠️ Skipping ${externalProduct.name}: Invalid price (${basePrice})`)
          continue
        }
        
        const margin = margin_percentage !== undefined ? margin_percentage : 15
        const marginAmount = basePrice * (margin / 100)
        const finalPrice = Math.round((basePrice + marginAmount) * 100) // Convert to cents

        // Create product handle with provider prefix
        const productName = productData.name || 'Imported Product'
        const providerPrefix = provider === 'kinguin' ? 'kinguin-' : 'cws-'
        const handle = (providerPrefix + productName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''))
          .substring(0, 100) // Limit handle length

        // Thumbnail handling (provider-specific)
        const thumbnailUrl = provider === 'kinguin'
          ? (productData.image || externalProduct.image || 'https://placehold.co/600x400/1a1d24/ff6b35?text=No+Image')
          : `https://api.codeswholesale.com/v1/products/${productData.productId}/image?format=MEDIUM`
        
        // Only use ONE image - no duplicates (frontend will handle zoom)
        const productImages = [{ url: thumbnailUrl }]
        
        // Check if product already exists - UPDATE instead of skip
        const existingProducts = await productModule.listProducts({ handle })
        let productToUse
        
        if (existingProducts && existingProducts.length > 0) {
          // UPDATE existing product
          const existingProduct = existingProducts[0]
          logger.info(`🔄 Updating ${productName}`)
          
          await productModule.updateProducts(existingProduct.id, {
            title: productName.substring(0, 255),
            thumbnail: thumbnailUrl,
            images: productImages,
            metadata: {
              provider: provider,
              provider_product_id: productData.productId,
              platform: productData.platform || 'PC',
              region: productData.region || 'GLOBAL',
              original_price: basePrice,
              margin_applied: margin_percentage || 15,
              imported_at: new Date().toISOString(),
            },
          })
          
          productToUse = existingProduct
        } else {
          // CREATE new product
          logger.info(`✨ Creating ${productName}`)
          
          productToUse = await productModule.createProducts({
            title: productName.substring(0, 255),
            handle: handle,
            status: 'published',
            description: productData.description || `${productName} - Digital game key delivered instantly`,
            thumbnail: thumbnailUrl, // Always MEDIUM
            images: productImages,
            metadata: {
              provider: provider,
              provider_product_id: productData.productId,
              platform: productData.platform || 'PC',
              region: productData.region || 'GLOBAL',
              original_price: basePrice,
              margin_applied: margin,
              imported_at: new Date().toISOString(),
              languages: productData.languages || [],
              badges: productData.badges || [],
            },
          })
        }

        // Create/Update variant with proper pricing (MULTI-CURRENCY)
        if (productToUse && productToUse.id) {
          // Calculate prices for all currencies using settings
          const multiCurrencyPrices = calculateMultiCurrencyPrices(finalPrice, currencyRates)

          // Check if variant with this SKU already exists
          const variantSku = `${provider.toUpperCase()}-${productData.productId}`.substring(0, 100)
          const existingVariants = await productModule.listProductVariants({ sku: variantSku })
          
          let variant
          
          if (existingVariants && existingVariants.length > 0) {
            // UPDATE existing variant's price
            variant = existingVariants[0]
            
            // Create new price set and update the link
            const priceSet = await pricingModule.createPriceSets({
              prices: multiCurrencyPrices,
            })
            
            // Update the price link
            await remoteLink.dismiss({
              [Modules.PRODUCT]: { variant_id: variant.id },
              [Modules.PRICING]: {},
            })
            
            await remoteLink.create({
              [Modules.PRODUCT]: { variant_id: variant.id },
              [Modules.PRICING]: { price_set_id: priceSet.id },
            })
          } else {
            // CREATE new variant
            // Step 1: Create price set with multi-currency pricing
            const priceSet = await pricingModule.createPriceSets({
              prices: multiCurrencyPrices,
            })

            // Step 2: Create variant
            const variants = await productModule.createProductVariants([{
              product_id: productToUse.id,
              title: 'Standard Edition',
              sku: variantSku,
              manage_inventory: false,
            }])

            variant = variants[0]

            // Step 3: Link variant to price set
            await remoteLink.create({
              [Modules.PRODUCT]: {
                variant_id: variant.id,
              },
              [Modules.PRICING]: {
                price_set_id: priceSet.id,
              },
            })
          }

          // Auto-link to Default Sales Channel
          if (defaultChannel) {
            try {
              await remoteLink.create({
                [Modules.PRODUCT]: {
                  product_id: productToUse.id,
                },
                [Modules.SALES_CHANNEL]: {
                  sales_channel_id: defaultChannel.id,
                },
              })
              logger.info(`🔗 Linked ${productName} to Default Sales Channel`)
            } catch (linkError: any) {
              // Ignore "already exists" errors
              if (linkError.message && linkError.message.includes('already exists')) {
                logger.info(`⏭️ ${productName} already linked`)
              } else {
                logger.warn(`⚠️ Failed to link ${productName}:`, linkError.message)
              }
            }
          }

          importedProducts.push(productToUse)
          logger.info(`✅ Imported: ${productName} - $${(finalPrice / 100).toFixed(2)} (base: $${basePrice.toFixed(2)} + ${margin}%)`)
        }
        // Extra delay every 50 items
        if (totalAttempted % 50 === 0) {
          logger.info(`⏸️ Brief pause to respect API rate limits...`)
          await new Promise(resolve => setTimeout(resolve, 5000))
        }

      } catch (error: any) {
        logger.error(`❌ Failed to import ${externalProduct.name}:`, error.message)
      }

      // Delay to prevent rate limiting (300ms)
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    logger.info(`🎉 Bulk import completed: ${importedProducts.length}/${totalAttempted} products imported`)

    res.status(201).json({
      message: `Successfully imported ${importedProducts.length} out of ${totalAttempted} products`,
      imported_count: importedProducts.length,
      total_attempted: totalAttempted,
      imported_products: importedProducts,
    })
  } catch (error: any) {
    console.error('Bulk import error:', error)
    res.status(500).json({
      message: 'Failed to bulk import products',
      error: error.message,
      details: error.stack,
    })
  }
}

