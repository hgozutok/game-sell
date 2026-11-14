import { Module } from "@medusajs/framework/utils"
import KinguinService from "./service"

// Ayri kayit adi: ana kinguin moduluyle (src/modules/kinguin) cakismasin.
export const KEY_PROVIDER_KINGUIN_MODULE = "keyProviderKinguin"

export default Module(KEY_PROVIDER_KINGUIN_MODULE, {
  service: KinguinService,
})

