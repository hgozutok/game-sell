import { Module } from "@medusajs/framework/utils"
import CodesWholesaleService from "./service"

export const CODESWHOLESALE_MODULE = "codesWholesale"

export default Module(CODESWHOLESALE_MODULE, {
  service: CodesWholesaleService,
})

