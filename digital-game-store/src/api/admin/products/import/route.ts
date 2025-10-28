import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

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
    const logger = req.scope.resolve('logger') as any
    
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

        // Create product handle
        const productName = externalProduct.name || 'Imported Product'
        const handle = productName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 100)

        // Always use MEDIUM format for best quality
        const thumbnailUrl = `https://api.codeswholesale.com/v1/products/${externalProduct.productId}/image?format=MEDIUM`
        
        // Only use ONE image - no duplicates (frontend will handle zoom)
        const productImages = [{ url: thumbnailUrl }]

        // Create product in Medusa
        const createdProduct = await productModule.createProducts({
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
        
        // Create variant with proper pricing
        if (createdProduct && createdProduct.id) {
          // Step 1: Create price set
          const priceSet = await pricingModule.createPriceSets({
            prices: [{
              amount: finalPrice, // Already in cents
              currency_code: 'usd',
              rules: {},
            }],
          })

          // Step 2: Create variant
          const variants = await productModule.createProductVariants([{
            product_id: createdProduct.id,
            title: 'Standard Edition',
            sku: `${provider.toUpperCase()}-${externalProduct.productId}`.substring(0, 100),
            manage_inventory: false,
          }])

          const variant = variants[0]

          // Step 3: Link variant to price set
          await remoteLink.create({
            [Modules.PRODUCT]: {
              variant_id: variant.id,
            },
            [Modules.PRICING]: {
              price_set_id: priceSet.id,
            },
          })
          
          // Auto-link to Default Sales Channel
          if (defaultChannel) {
            try {
              await remoteLink.create({
                [Modules.PRODUCT]: {
                  product_id: createdProduct.id,
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
        importedProducts.push(createdProduct)
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
