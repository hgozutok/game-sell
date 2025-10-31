import { model } from "@medusajs/framework/utils"

export const UserPreference = model.define("user_preference", {
  id: model.id().primaryKey(),
  user_id: model.text().nullable(), // null for anonymous/admin users, or user ID for authenticated users
  key: model.text(), // e.g., "admin.products.filters", "admin.products.limit"
  value: model.json(), // Store any JSON value
})

