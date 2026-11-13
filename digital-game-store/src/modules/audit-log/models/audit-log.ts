import { model } from "@medusajs/framework/utils"

// Admin ayar/yonetim eylemlerinin denetim kaydi — kim, ne zaman, neyi degistirdi.
const AuditLog = model.define("audit_log", {
  id: model.id().primaryKey(),
  // eylem: settings.update, pricing_rule.create, fulfillment.approve ...
  action: model.text(),
  // etkilenen varlik: kinguin_settings, pricing_rule, order ...
  entity: model.text(),
  entity_id: model.text().nullable(),
  // degisiklik oncesi/sonrasi ozeti (asla secret/plain key icermez)
  diff: model.json().nullable(),
  actor_id: model.text().nullable(),
  actor_email: model.text().nullable(),
  ip: model.text().nullable(),
})

export default AuditLog
