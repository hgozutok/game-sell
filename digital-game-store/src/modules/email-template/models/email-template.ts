import { model } from "@medusajs/framework/utils"

/**
 * Admin tarafindan duzenlenebilen e-posta sablonlari.
 * `key` sablonun kod tarafindaki adidir (order-digital-keys vb.).
 */
const EmailTemplate = model.define("email_template", {
  id: model.id().primaryKey(),
  key: model.text(),
  locale: model.text().default("tr"),
  name: model.text(),
  subject: model.text(),
  html: model.text(),
  text: model.text().nullable(),
  active: model.boolean().default(true),
})

export default EmailTemplate
