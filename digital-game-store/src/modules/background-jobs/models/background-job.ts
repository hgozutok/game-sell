import { model } from "@medusajs/framework/utils"

const BackgroundJob = model.define("background_job", {
  id: model.id().primaryKey(),
  type: model.text(), // 'import', 'sync', 'update_prices', etc.
  status: model.enum(['pending', 'running', 'completed', 'failed']).default('pending'),
  progress: model.number().default(0), // 0-100
  total_items: model.number().default(0),
  processed_items: model.number().default(0),
  result: model.json().nullable(),
  error: model.text().nullable(),
  metadata: model.json().nullable(),
  completed_at: model.dateTime().nullable(),
})

export default BackgroundJob

