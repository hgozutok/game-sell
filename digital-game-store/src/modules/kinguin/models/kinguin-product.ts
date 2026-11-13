import { model } from "@medusajs/framework/utils"

// Kinguin katalog ogresinin yerel kopyasi — senkronizasyon ve listing durumu burada tutulur.
// Medusa Product/Variant ile baglanti src/links uzerinden kurulur.
const KinguinProduct = model.define("kinguin_product", {
  id: model.id().primaryKey(),
  kinguin_id: model.text().unique().searchable(),
  // ESA'nin string productId'si (siparis olustururken kullanilir)
  product_id: model.text().nullable(),
  name: model.text().searchable(),
  original_name: model.text().nullable(),
  platform: model.text().nullable(),
  genre: model.text().nullable(),
  region_id: model.number().nullable(),
  region_limitations: model.text().nullable(),
  qty: model.number().default(0),
  text_qty: model.number().default(0),
  // saglayici para biriminde MINOR UNIT (kurus) — API float doner, depolama integer
  price: model.number().default(0),
  currency: model.text().default("eur"),
  images: model.json().nullable(),
  description: model.text().nullable(),
  system_requirements: model.json().nullable(),
  release_date: model.dateTime().nullable(),
  age_rating: model.number().nullable(),
  genres: model.json().nullable(), // tum genre listesi
  tags: model.json().nullable(),
  is_preorder: model.boolean().default(false),
  has_text: model.boolean().default(true),
  store_listed: model.boolean().default(false), // magazada yayinda mi
  // Maliyet degisimi esigi asarsa otomatik uygulama yerine onaya duser
  pending_price: model.number().nullable(), // onay bekleyen satis fiyati (usd minor)
  pending_cost: model.number().nullable(), // onay bekleyen maliyet (provider currency)
  medusa_product_id: model.text().nullable(),
  medusa_variant_id: model.text().nullable(),
  last_synced_at: model.dateTime().nullable(),
  raw_payload: model.json().nullable(),
})

export default KinguinProduct
