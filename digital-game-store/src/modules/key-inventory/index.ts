import { Module } from "@medusajs/framework/utils"
import KeyInventoryService from "./service"

export const KEY_INVENTORY_MODULE = "keyInventory"

export default Module(KEY_INVENTORY_MODULE, {
  service: KeyInventoryService,
})

