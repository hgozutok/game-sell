import { model } from "@medusajs/framework/utils"

export const DigitalKey = model.define("digital_key", {
  id: model.id().primaryKey(),
  key_code: model.text().searchable(),
  product_id: model.text(),
  variant_id: model.text().nullable(),
  provider: model.enum(["codesWholesale", "kinguin", "manual"]).default("manual"),
  sku: model.text().nullable(),
  status: model.enum(["available", "assigned", "delivered", "revoked"]).default("available"),
  order_id: model.text().nullable(),
  customer_id: model.text().nullable(),
  assigned_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
  revoked_at: model.dateTime().nullable(),
  platform: model.text().nullable(), // Steam, Epic, Origin, etc.
  region: model.text().nullable(), // GLOBAL, EU, US, etc.
  metadata: model.json().nullable(),
})

