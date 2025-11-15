import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getCurrencyRates, calculateMultiCurrencyPrices, convertCurrencyAmount } from '../../../../utils/currency'

export const AUTHENTICATE = false // Disable auth for development

// Helper: Get or create collection by name
async function getOrCreateCollection(productModule: any, name: string, logger: any) {
  try {
    logger.info(`🔍 Looking for collection: ${name}`)
    const existing = await productModule.listProductCollections({ title: name })
    logger.info(`   Found ${existing?.length || 0} existing collections`)
    
    if (existing && existing.length > 0) {
      logger.info(`   ✅ Using existing collection: ${name} (ID: ${existing[0].id})`)
      return existing[0]
    }

    logger.info(`   🆕 Creating new collection: ${name}`)
    const collection = await productModule.createProductCollections({
      title: name,
      handle: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    })
    logger.info(`   ✨ Created collection: ${name} (ID: ${collection.id})`)
    return collection
  } catch (error: any) {
    logger.error(`   ❌ Collection error for "${name}":`, error.message)
    logger.error(`   Stack:`, error.stack)
    return null
  }
}

// Helper: Get or create tag by value
async function getOrCreateTag(productModule: any, value: string, logger: any) {
  try {
    logger.info(`🔍 Looking for tag: ${value}`)
    const existing = await productModule.listProductTags({ value })
    logger.info(`   Found ${existing?.length || 0} existing tags`)
    
    if (existing && existing.length > 0) {
      logger.info(`   ✅ Using existing tag: ${value} (ID: ${existing[0].id})`)
      return existing[0]
    }

    logger.info(`   🆕 Creating new tag: ${value}`)
    const tag = await productModule.createProductTags({ value })
    logger.info(`   ✨ Created tag: ${value} (ID: ${tag.id})`)
    return tag
  } catch (error: any) {
    logger.error(`   ❌ Tag error for "${value}":`, error.message)
    logger.error(`   Stack:`, error.stack)
    return null
  }
}

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

    const providerCurrencyKey = provider === 'kinguin'
      ? 'provider.currency.kinguin'
      : 'provider.currency.codeswholesale'
    const providerCurrency = await storeSettings.getSettingValue(
      providerCurrencyKey,
      provider === 'kinguin' ? 'eur' : 'usd'
    )
    
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
        const providerPriceWithMargin = basePrice + marginAmount
        const providerPriceWithMarginMinor = Math.round(providerPriceWithMargin * 100)

        const productName = productData.name || 'Imported Product'

        let finalPriceUsd = providerPriceWithMarginMinor
        try {
          finalPriceUsd = convertCurrencyAmount(
            providerPriceWithMarginMinor,
            providerCurrency,
            'usd',
            currencyRates
          )
        } catch (conversionError: any) {
          logger.warn(`⚠️ Currency conversion failed for ${productName}:`, conversionError.message)
        }

        // Create product handle with provider prefix
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
        
        // Prepare collections and tags (for both UPDATE and CREATE)
        const collections = []
        const tags = []
        
        // Debug: Log productData fields for first product
        if (totalAttempted === 1) {
          logger.info(`🔍 Product data fields:`, {
            hasGenres: !!productData.genres,
            genres: productData.genres,
            hasTags: !!productData.tags,
            tags: productData.tags,
            hasPlatform: !!productData.platform,
            platform: productData.platform,
          })
        }
        
        // Add genre as collection (Kinguin)
        if (productData.genres && Array.isArray(productData.genres) && productData.genres.length > 0) {
          if (totalAttempted === 1) logger.info(`📚 Adding ${productData.genres.length} genres as collections`)
          for (const genre of productData.genres) {
            const collection = await getOrCreateCollection(productModule, genre, logger)
            if (collection) collections.push(collection.id)
          }
        }
        
        // Add platform as collection
        if (productData.platform) {
          if (totalAttempted === 1) logger.info(`🎮 Adding platform as collection: ${productData.platform}`)
          const platformCollection = await getOrCreateCollection(productModule, productData.platform, logger)
          if (platformCollection) collections.push(platformCollection.id)
        }
        
        // Add provider as tag
        if (totalAttempted === 1) logger.info(`🏷️ Adding provider tag: ${provider}`)
        const providerTag = await getOrCreateTag(productModule, provider, logger)
        if (providerTag) tags.push(providerTag.id)
        
        // Add custom tags (Kinguin)
        if (productData.tags && Array.isArray(productData.tags) && productData.tags.length > 0) {
          if (totalAttempted === 1) logger.info(`🏷️ Adding ${productData.tags.length} custom tags`)
          for (const tagValue of productData.tags) {
            const tag = await getOrCreateTag(productModule, tagValue, logger)
            if (tag) tags.push(tag.id)
          }
        }
        
        if (totalAttempted === 1) {
          logger.info(`✅ Prepared ${collections.length} collections and ${tags.length} tags for ${productName}`)
        }
        
        // Check if product already exists - UPDATE instead of skip
        const existingProducts = await productModule.listProducts({ handle })
        let productToUse
        
        if (existingProducts && existingProducts.length > 0) {
          // UPDATE existing product (with collections and tags)
          const existingProduct = existingProducts[0]
          if (totalAttempted <= 3) {
            logger.info(`🔄 Updating ${productName}`)
          }
          
          await productModule.updateProducts(existingProduct.id, {
            title: productName.substring(0, 255),
            thumbnail: thumbnailUrl,
            images: productImages,
            collection_ids: collections.length > 0 ? collections : undefined,
            tag_ids: tags.length > 0 ? tags : undefined,
            metadata: {
              provider: provider,
              provider_product_id: productData.productId,
              platform: productData.platform || 'PC',
              region: productData.region || 'GLOBAL',
              original_price: basePrice,
              provider_currency: providerCurrency,
              margin_applied: margin_percentage || 15,
              imported_at: new Date().toISOString(),
              genres: productData.genres || [],
              tags: productData.tags || [],
              developers: productData.developers || [],
              publishers: productData.publishers || [],
            },
          })
          
          productToUse = existingProduct
        } else {
          // CREATE new product
          if (totalAttempted <= 3) {
            logger.info(`✨ Creating ${productName}`)
          }
          
          productToUse = await productModule.createProducts({
            title: productName.substring(0, 255),
            handle: handle,
            status: 'published',
            description: productData.description || `${productName} - Digital game key delivered instantly`,
            thumbnail: thumbnailUrl, // Always MEDIUM
            images: productImages,
            collection_ids: collections.length > 0 ? collections : undefined,
            tag_ids: tags.length > 0 ? tags : undefined,
            metadata: {
              provider: provider,
              provider_product_id: productData.productId,
              platform: productData.platform || 'PC',
              region: productData.region || 'GLOBAL',
              original_price: basePrice,
              provider_currency: providerCurrency,
              margin_applied: margin,
              imported_at: new Date().toISOString(),
              languages: productData.languages || [],
              badges: productData.badges || [],
              genres: productData.genres || [],
              tags: productData.tags || [],
              developers: productData.developers || [],
              publishers: productData.publishers || [],
            },
          })
        }

        // Create/Update variant with proper pricing (MULTI-CURRENCY)
        if (productToUse && productToUse.id) {
          // Calculate prices for all currencies using settings
          const multiCurrencyPrices = calculateMultiCurrencyPrices(finalPriceUsd, currencyRates)

          // Check if variant with this SKU already exists
          const variantSku = `${provider.toUpperCase()}-${productData.productId}`.substring(0, 100)
          const existingVariants = await productModule.listProductVariants({ sku: variantSku })
          
          let variant
          
          if (existingVariants && existingVariants.length > 0) {
            // Variant already exists - skip price update (complex operation)
            variant = existingVariants[0]
            logger.info(`ℹ️ Variant exists for ${productName}, product metadata updated`)
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
            await remoteLink.create([{
              [Modules.PRODUCT]: {
                variant_id: variant.id,
              },
              [Modules.PRICING]: {
                price_set_id: priceSet.id,
              },
            }])
          }

          // Auto-link to Default Sales Channel
          if (defaultChannel) {
            try {
              await remoteLink.create([{
                [Modules.PRODUCT]: {
                  product_id: productToUse.id,
                },
                [Modules.SALES_CHANNEL]: {
                  sales_channel_id: defaultChannel.id,
                },
              }])
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
          logger.info(`✅ Imported: ${productName} - $${(finalPriceUsd / 100).toFixed(2)} (base: $${basePrice.toFixed(2)} + ${margin}%)`)
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

