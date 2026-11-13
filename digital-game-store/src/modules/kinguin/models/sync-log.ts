import { model } from "@medusajs/framework/utils"

// Her senkronizasyon calismasinin sonucu — admin panelde goruntulenir.
const SyncLog = model.define("sync_log", {
  id: model.id().primaryKey(),
  type: model.enum(["full", "price", "stock", "import", "order_status"]).default("full"),
  source: model.text().default("kinguin"),
  status: model.enum(["running", "completed", "failed"]).default("running"),
  items_total: model.number().default(0),
  items_added: model.number().default(0),
  items_updated: model.number().default(0),
  items_failed: model.number().default(0),
  // Onay bekleyen fiyat degisiklikleri vs.
  pending_approvals: model.number().default(0),
  errors: model.json().nullable(),
  details: model.json().nullable(),
  started_at: model.dateTime().default(null).nullable(),
  finished_at: model.dateTime().nullable(),
})

export default SyncLog
