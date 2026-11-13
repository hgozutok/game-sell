import { ModuleProvider } from "@medusajs/framework/utils"
import NotificationLoggerProviderService from "./service"

const services = [NotificationLoggerProviderService]

export default ModuleProvider("notification", {
  services,
})
