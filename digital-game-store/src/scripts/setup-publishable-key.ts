import { Modules } from "@medusajs/framework/utils"

export default async function({ container }: any) {
  const apiKeyModuleService = container.resolve(Modules.API_KEY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const logger = container.resolve("logger")

  logger.info("🔑 Setting up publishable API key with sales channel...")

  try {
    // Get default sales channel
    const salesChannels = await salesChannelModuleService.listSalesChannels()
    
    if (salesChannels.length === 0) {
      logger.error("No sales channel found!")
      return
    }

    const defaultChannel = salesChannels[0]
    logger.info(`Found channel: ${defaultChannel.name}`)

    // Create publishable API key
    const apiKey = await apiKeyModuleService.createApiKeys({
      title: "Storefront Key",
      type: "publishable",
      created_by: "admin",
    })

    logger.info(`✅ Created API Key: ${apiKey.token}`)
    logger.info(`\n📝 Add this to storefront/.env.local:`)
    logger.info(`NEXT_PUBLIC_PUBLISHABLE_KEY=${apiKey.token}\n`)

    // Link API key to sales channel
    const remoteLink = container.resolve("remoteLink")
    
    await remoteLink.create({
      [Modules.API_KEY]: {
        api_key_id: apiKey.id,
      },
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: defaultChannel.id,
      },
    })

    logger.info("✅ API key linked to sales channel!")
    logger.info("\n🎉 Setup complete! Copy the key above to your .env.local file.")

  } catch (error: any) {
    if (error.message && error.message.includes("already exists")) {
      logger.info("⚠️  API key already exists, fetching existing keys...")
      
      const existingKeys = await apiKeyModuleService.listApiKeys({
        type: "publishable"
      })
      
      if (existingKeys.length > 0) {
        logger.info(`\n✅ Use this existing key in .env.local:`)
        logger.info(`NEXT_PUBLIC_PUBLISHABLE_KEY=${existingKeys[0].token}\n`)
      }
    } else {
      logger.error("Failed to setup API key:", error)
    }
  }
}

