import { Modules } from "@medusajs/framework/utils"

export default async function({ container }: any) {
  const logger = container.resolve("logger")
  const authModule = container.resolve(Modules.AUTH)

  const result = await authModule.updateProvider("emailpass", {
    entity_id: "info@hupiplay.uk",
    password: "Pd8379Hg!",
    body: {},
  })

  if (result.success) {
    logger.info("Password updated for info@hupiplay.uk")
  } else {
    logger.error(`Failed: ${result.error}`)
  }
  process.exit(result.success ? 0 : 1)
}
