import { Modules } from "@medusajs/framework/utils"

export default async function({ container }: any) {
  const logger = container.resolve("logger")
  const userModuleService = container.resolve(Modules.USER)

  logger.info("🔑 Resetting admin password...")

  try {
    // Get admin user
    const users = await userModuleService.listUsers({
      email: "admin@digitalgamestore.com"
    })

    if (!users || users.length === 0) {
      logger.error("❌ Admin user not found!")
      
      // Create new admin
      logger.info("Creating new admin user...")
      await userModuleService.createUsers({
        email: "admin@digitalgamestore.com",
        first_name: "Admin",
        last_name: "User",
      })
      
      logger.info("✅ Admin user created!")
      logger.info("\nUse Medusa Admin UI to set password:")
      logger.info("http://localhost:9000/app")
      return
    }

    const admin = users[0]
    logger.info(`✅ Found admin user: ${admin.email}`)
    logger.info(`   ID: ${admin.id}`)
    logger.info("\n📝 To set password, use Medusa Admin UI:")
    logger.info("   1. Go to: http://localhost:9000/app")
    logger.info("   2. Use 'Forgot Password' or contact support")
    logger.info("\n💡 Or create a new admin:")
    logger.info("   npx medusa user --email newadmin@example.com --password yourpassword")
    
  } catch (error: any) {
    logger.error("❌ Error:", error.message)
  }
}

