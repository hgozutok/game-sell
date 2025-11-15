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

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { provider, product_ids, search_query, margin_percentage, category_id } = req.body as any

  if (!provider || (!product_ids && !search_query)) {
    return res.status(400).json({
      message: 'Missing required fields: provider and (product_ids or search_query)',
    })
  }

  if (provider !== 'codeswholesale' && provider !== 'kinguin') {
    return res.status(400).json({
      message: 'Invalid provider. Must be "codeswholesale" or "kinguin"',
    })
  }

  try {
    // Get the appropriate provider service
    const providerModuleName = provider === 'codeswholesale' ? 'codesWholesale' : 'kinguin'
    const providerService = req.scope.resolve(providerModuleName) as any
    const productModule = req.scope.resolve('product') as any // Direct service name
    const pricingModule = req.scope.resolve(Modules.PRICING) as any
    const salesChannelModule = req.scope.resolve(Modules.SALES_CHANNEL) as any
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any
    const storeSettings = req.scope.resolve('storeSettings') as any
    const logger = req.scope.resolve('logger') as any
    
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
      
      if (defaultChannel) {
        logger.info(`✅ Found Default Sales Channel: ${defaultChannel.id}`)
      }
    } catch (channelError: any) {
      logger.warn('⚠️ Could not fetch sales channels:', channelError.message)
    }

    const importedProducts = []
    let products = []

    // Fetch products from provider
    if (product_ids && Array.isArray(product_ids)) {
      // Import specific products by ID
      for (const productId of product_ids) {
        const product = await providerService.getProductInfo(productId)
        if (product) {
          products.push(product)
        }
      }
    } else if (search_query) {
      // Search and import products
      const searchResults = await providerService.searchProducts(search_query)
      products = searchResults || []
    }

    // Import each product
    for (const externalProduct of products) {
      try {
        const productName = externalProduct.name || 'Imported Product'

        // Calculate price with margin
        const basePrice = externalProduct.price || 0
        // Calculate final price with margin, respecting provider currency
        const margin = margin_percentage !== undefined ? margin_percentage : 15
        const marginAmount = basePrice * (margin / 100)
        const providerPriceWithMargin = basePrice + marginAmount
        const providerPriceWithMarginInMinor = Math.round(providerPriceWithMargin * 100)

        let finalPriceUsd = providerPriceWithMarginInMinor
        try {
          finalPriceUsd = convertCurrencyAmount(
            providerPriceWithMarginInMinor,
            providerCurrency,
            'usd',
            currencyRates
          )
        } catch (conversionError: any) {
          logger.warn(`⚠️ Failed to convert ${providerCurrency.toUpperCase()} price to USD for ${productName}:`, conversionError.message)
        }

        // Create product handle with provider prefix
        const providerPrefix = provider === 'kinguin' ? 'kinguin-' : 'cws-'
        const handle = (providerPrefix + productName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''))
          .substring(0, 100)

        // Thumbnail handling (provider-specific)
        const thumbnailUrl = provider === 'kinguin'
          ? (externalProduct.image || 'https://placehold.co/600x400/1a1d24/ff6b35?text=No+Image')
          : `https://api.codeswholesale.com/v1/products/${externalProduct.productId}/image?format=MEDIUM`
        
        // Only use ONE image - no duplicates (frontend will handle zoom)
        const productImages = [{ url: thumbnailUrl }]

        // Prepare collections and tags (for both UPDATE and CREATE)
        const collections = []
        const tags = []
        
        logger.info(`🔍 Product data for ${productName}:`, {
          hasGenres: !!externalProduct.genres,
          genres: externalProduct.genres,
          hasTags: !!externalProduct.tags,
          tags: externalProduct.tags,
          platform: externalProduct.platform,
        })
        
        // Add genre as collection (Kinguin)
        if (externalProduct.genres && Array.isArray(externalProduct.genres) && externalProduct.genres.length > 0) {
          logger.info(`📚 Adding ${externalProduct.genres.length} genres as collections`)
          for (const genre of externalProduct.genres) {
            const collection = await getOrCreateCollection(productModule, genre, logger)
            if (collection) collections.push(collection.id)
          }
        }
        
        // Add platform as collection
        if (externalProduct.platform) {
          logger.info(`🎮 Adding platform as collection: ${externalProduct.platform}`)
          const platformCollection = await getOrCreateCollection(productModule, externalProduct.platform, logger)
          if (platformCollection) collections.push(platformCollection.id)
        }
        
        // Add provider as tag
        logger.info(`🏷️ Adding provider tag: ${provider}`)
        const providerTag = await getOrCreateTag(productModule, provider, logger)
        if (providerTag) tags.push(providerTag.id)
        
        // Add custom tags (Kinguin)
        if (externalProduct.tags && Array.isArray(externalProduct.tags) && externalProduct.tags.length > 0) {
          logger.info(`🏷️ Adding ${externalProduct.tags.length} custom tags`)
          for (const tagValue of externalProduct.tags) {
            const tag = await getOrCreateTag(productModule, tagValue, logger)
            if (tag) tags.push(tag.id)
          }
        }
        
        logger.info(`✅ Prepared ${collections.length} collections and ${tags.length} tags for ${productName}`)

        // Check if product already exists - UPDATE instead of skip
        const existingProducts = await productModule.listProducts({ handle })
        let productToUse
        
        if (existingProducts && existingProducts.length > 0) {
          // UPDATE existing product (with collections and tags)
          const existingProduct = existingProducts[0]
          logger.info(`🔄 Updating ${productName}`)
          
          await productModule.updateProducts(existingProduct.id, {
            title: productName.substring(0, 255),
            thumbnail: thumbnailUrl,
            images: productImages,
            collection_ids: collections.length > 0 ? collections : undefined,
            tag_ids: tags.length > 0 ? tags : undefined,
            metadata: {
              provider: provider,
              provider_product_id: externalProduct.productId,
              platform: externalProduct.platform || 'PC',
              region: externalProduct.region || 'GLOBAL',
              original_price: basePrice,
              provider_currency: providerCurrency,
              margin_applied: margin_percentage || 15,
              imported_at: new Date().toISOString(),
              genres: externalProduct.genres || [],
              tags: externalProduct.tags || [],
              developers: externalProduct.developers || [],
              publishers: externalProduct.publishers || [],
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
            thumbnail: thumbnailUrl, // Always MEDIUM
            images: productImages,
            collection_ids: collections.length > 0 ? collections : undefined,
            tag_ids: tags.length > 0 ? tags : undefined,
            metadata: {
              provider: provider,
              provider_product_id: externalProduct.productId,
              platform: externalProduct.platform || 'PC',
              region: externalProduct.region || 'GLOBAL',
              original_price: basePrice,
              provider_currency: providerCurrency,
              margin_applied: margin_percentage || 15,
              languages: externalProduct.languages || [],
              badges: externalProduct.badges || [],
              genres: externalProduct.genres || [],
              tags: externalProduct.tags || [],
              developers: externalProduct.developers || [],
              publishers: externalProduct.publishers || [],
            },
          })
        }
        
        // Create/Update variant with proper pricing (MULTI-CURRENCY)
        if (productToUse && productToUse.id) {
          // Calculate prices for all currencies using settings
          const multiCurrencyPrices = calculateMultiCurrencyPrices(finalPriceUsd, currencyRates)

          // Check if variant with this SKU already exists
          const variantSku = `${provider.toUpperCase()}-${externalProduct.productId}`.substring(0, 100)
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
              logger.info(`🔗 Linked ${externalProduct.name} to Default Sales Channel`)
            } catch (linkError: any) {
              // Ignore "already exists" errors
              if (linkError.message && linkError.message.includes('already exists')) {
                logger.info(`⏭️ ${externalProduct.name} already linked`)
              } else {
                logger.warn(`⚠️ Failed to link ${externalProduct.name}:`, linkError.message)
              }
            }
          }
        }
        importedProducts.push(productToUse)
      } catch (error) {
        console.error(`Failed to import product: ${externalProduct.name}`, error)
      }
    }

    res.status(201).json({
      message: `Successfully imported ${importedProducts.length} out of ${products.length} products`,
      imported_products: importedProducts,
      total_attempted: products.length,
    })
  } catch (error: any) {
    console.error('Product import error:', error)
    res.status(500).json({
      message: 'Failed to import products',
      error: error.message,
    })
  }
}
