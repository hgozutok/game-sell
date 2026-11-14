import { model } from "@medusajs/framework/utils"

// Kinguin siparisinin yerel kaydi. medusa_order_id unique oldugu icin ayni
// Medusa siparisine hicbir zaman iki Kinguin siparisi olusturulamaz (idempotency).
const KinguinOrder = model.define("kinguin_order", {
  id: model.id().primaryKey(),
  order_id: model.text().unique(), // Kinguin tarafindan donen orderId
  external_id: model.text().nullable(), // bize gonderdigmiz orderExternalId
  status: model
    .enum(["pending", "processing", "completed", "canceled", "failed", "refunded"])
    .default("pending"),
  total_price: model.number().default(0),
  currency: model.text().default("eur"),
  products: model.json().nullable(), // istek gonderilen satirlar
  // Sifreli key payload (AES-256-GCM, src/utils/key-crypto ile sifrelenir)
  keys_encrypted: model.json().nullable(),
  keys_delivered_at: model.dateTime().nullable(),
  medusa_order_id: model.text().unique().nullable(),
  idempotency_key: model.text().nullable(),
  error: model.text().nullable(),
  retries: model.number().default(0),
})

export default KinguinOrder
