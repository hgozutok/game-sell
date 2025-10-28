import StoreSettingsService from "./service"
import { Module } from "@medusajs/framework/utils"

export const STORE_SETTINGS_MODULE = "storeSettings"

export default Module(STORE_SETTINGS_MODULE, {
  service: StoreSettingsService,
})

