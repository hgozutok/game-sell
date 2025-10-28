import { Modules } from "@medusajs/framework/utils"

export default async function({ container }: any) {
  const logger = container.resolve("logger")
  const customerModuleService = container.resolve(Modules.CUSTOMER)

  logger.info("🧪 Creating test customer...")

  try {
    // Create a test customer
    const customer = await customerModuleService.createCustomers({
      email: "test@test.com",
      first_name: "Test",
      last_name: "User",
      has_account: true,
    })

    logger.info(`✅ Test customer created:`)
    logger.info(`   Email: test@test.com`)
    logger.info(`   ID: ${customer.id}`)
    logger.info(`\n⚠️  Note: Set password using admin panel or direct DB update`)
    logger.info(`\nTo login, you'll need to set a password hash in the database.`)
    
  } catch (error: any) {
    if (error.message && error.message.includes('already exists')) {
      logger.info("✅ Test customer already exists")
      logger.info("   Email: test@test.com")
    } else {
      logger.error("❌ Failed to create customer:", error.message)
    }
  }
}

