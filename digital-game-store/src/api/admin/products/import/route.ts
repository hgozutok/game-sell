import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getCurrencyRates, calculateMultiCurrencyPrices } from '../../../../utils/currency'

export const AUTHENTICATE = false // Disable auth for development

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
        // Calculate price with margin
        const basePrice = externalProduct.price || 0
        // Calculate final price with margin (in cents)
        const margin = margin_percentage !== undefined ? margin_percentage : 15
        const marginAmount = basePrice * (margin / 100)
        const finalPrice = Math.round((basePrice + marginAmount) * 100) // Convert to cents

        // Create product handle with provider prefix
        const productName = externalProduct.name || 'Imported Product'
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
              provider_product_id: externalProduct.productId,
              platform: externalProduct.platform || 'PC',
              region: externalProduct.region || 'GLOBAL',
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
            thumbnail: thumbnailUrl, // Always MEDIUM
            images: productImages,
            metadata: {
              provider: provider,
              provider_product_id: externalProduct.productId,
              platform: externalProduct.platform || 'PC',
              region: externalProduct.region || 'GLOBAL',
              original_price: basePrice,
              margin_applied: margin_percentage || 15,
              languages: externalProduct.languages || [],
              badges: externalProduct.badges || [],
            },
          })
        }
        
        // Create/Update variant with proper pricing (MULTI-CURRENCY)
        if (productToUse && productToUse.id) {
          // Calculate prices for all currencies using settings
          const multiCurrencyPrices = calculateMultiCurrencyPrices(finalPrice, currencyRates)

          // Check if variant with this SKU already exists
          const variantSku = `${provider.toUpperCase()}-${externalProduct.productId}`.substring(0, 100)
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
