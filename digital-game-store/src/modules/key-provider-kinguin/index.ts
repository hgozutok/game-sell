import { Module } from "@medusajs/framework/utils"
import KinguinService from "./service"

export const KINGUIN_MODULE = "kinguin"

export default Module(KINGUIN_MODULE, {
  service: KinguinService,
})

