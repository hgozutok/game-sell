import { model } from "@medusajs/framework/utils"

const StoreSetting = model.define("store_setting", {
  id: model.id().primaryKey(),
  key: model.text().unique(),
  value: model.json(),
  category: model.text().default("general"), // general, theme, seo, payments
  description: model.text().nullable(),
})

export default StoreSetting

