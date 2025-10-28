import { Modules } from "@medusajs/framework/utils"

export default async function({ container }: any) {
  const productModuleService = container.resolve(Modules.PRODUCT)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const remoteLink = container.resolve("remoteLink")
  const logger = container.resolve("logger")

  logger.info("🔗 Linking products to default sales channel...")

  try {
    // Get first sales channel
    const salesChannels = await salesChannelModuleService.listSalesChannels()

    if (salesChannels.length === 0) {
      logger.error("No sales channel found!")
      return
    }

    const defaultChannel = salesChannels[0]
    logger.info(`Found channel: ${defaultChannel.name} (${defaultChannel.id})`)

    // Get all products
    const products = await productModuleService.listProducts()
    
    logger.info(`Found ${products?.length || 0} products`)

    // Link products to channel using remoteLink
    for (const product of products) {
      try {
        await remoteLink.create({
          [Modules.PRODUCT]: {
            product_id: product.id,
          },
          [Modules.SALES_CHANNEL]: {
            sales_channel_id: defaultChannel.id,
          },
        })
        logger.info(`✅ Linked: ${product.title}`)
      } catch (error: any) {
        if (error.message && error.message.includes("already exists")) {
          logger.info(`⏭️  Already linked: ${product.title}`)
        } else {
          logger.error(`❌ Failed to link ${product.title}:`, error)
        }
      }
    }

    logger.info("🎉 All products linked to sales channel!")
  } catch (error) {
    logger.error("Failed to link products:", error)
  }
}

