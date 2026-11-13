import { Module } from "@medusajs/framework/utils"
import EmailTemplateService from "./service"

export const EMAIL_TEMPLATE_MODULE = "emailTemplate"

export default Module(EMAIL_TEMPLATE_MODULE, {
  service: EmailTemplateService,
})
