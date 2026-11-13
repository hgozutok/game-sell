import { model } from "@medusajs/framework/utils"

// Tekil ayar satiri (id="default"). Admin panel kinguin-sync / kinguin-fulfillment
// sayfalari bu kaydi gunceller; sync job'lari ve fulfillment workflow okur.
const KinguinSettings = model.define("kinguin_settings", {
  id: model.id().primaryKey(),
  // Fulfillment
  auto_fulfill_enabled: model.boolean().default(true),
  order_mode: model.enum(["readonly", "live"]).default("readonly"),
  min_balance: model.number().default(10), // EUR — altina dusulurse otomatik fulfill durur
  stop_on_negative_margin: model.boolean().default(true),
  // Senkronizasyon
  sync_cron: model.text().default("0 */6 * * *"), // bilgi amacli gosterim
  sync_interval_minutes: model.number().default(360), // islemesi gereken aralik (15/60/360/1440)
  last_sync_at: model.dateTime().nullable(),
  sync_prices: model.boolean().default(true),
  sync_stock: model.boolean().default(true),
  sync_info: model.boolean().default(false),
  sync_new_products: model.boolean().default(false),
  hide_on_zero_stock: model.boolean().default(true),
  // Fiyatlandirma
  auto_reprice: model.boolean().default(true),
  max_price_change_pct: model.number().default(30), // buyukse admin onayina duser
  default_margin_pct: model.number().default(15),
  min_profit_pct: model.number().default(0),
  rounding_rule: model.enum(["none", "ninety_nine"]).default("ninety_nine"),
  provider_currency: model.text().default("eur"),
})

export default KinguinSettings
