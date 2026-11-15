import { model } from "@medusajs/framework/utils"

// Her senkronizasyon calismasinin sonucu — admin panelde goruntulenir.
const SyncLog = model.define("sync_log", {
  id: model.id().primaryKey(),
  type: model.enum(["full", "price", "stock", "import", "order_status"]).default("full"),
  source: model.text().default("kinguin"),
  // canceled: admin tarafindan durduruldu. "Takildi" durumu kalici degil;
  // running + heartbeat eskimis kayitlar listeleme sirasinda stalled olarak isaretlenir.
  status: model.enum(["running", "completed", "failed", "canceled"]).default("running"),
  items_total: model.number().default(0),
  items_added: model.number().default(0),
  items_updated: model.number().default(0),
  items_failed: model.number().default(0),
  // Onay bekleyen fiyat degisiklikleri vs.
  pending_approvals: model.number().default(0),
  // Uzun synclarda canli ilerleme; heartbeat eskimisse is "stalled" sayilir.
  progress_total: model.number().default(0),
  progress_processed: model.number().default(0),
  heartbeat_at: model.dateTime().nullable(),
  canceled_at: model.dateTime().nullable(),
  errors: model.json().nullable(),
  details: model.json().nullable(),
  started_at: model.dateTime().default(null).nullable(),
  finished_at: model.dateTime().nullable(),
})

export default SyncLog
