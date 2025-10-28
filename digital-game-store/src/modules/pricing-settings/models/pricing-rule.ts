import { model } from '@medusajs/framework/utils'

const PricingRule = model.define('pricing_rule', {
  id: model.id().primaryKey(),
  category_id: model.text().nullable(),
  category_name: model.text(),
  provider: model.text(), // 'cws' or 'kinguin' or 'all'
  margin_percentage: model.number(),
  min_price: model.number().nullable(),
  max_price: model.number().nullable(),
  is_active: model.boolean().default(true),
  priority: model.number().default(0), // Higher priority rules are applied first
})

export default PricingRule
