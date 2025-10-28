import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pricingSettingsService = req.scope.resolve('pricingSettingsService') as any
  
  const { provider, category_id, is_active } = req.query

  const rules = await pricingSettingsService.getAllPricingRules({
    ...(provider && { provider }),
    ...(category_id && { category_id }),
    ...(is_active !== undefined && { is_active: is_active === 'true' }),
  })

  res.json({ pricing_rules: rules })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pricingSettingsService = req.scope.resolve('pricingSettingsService') as any

  const { category_id, category_name, provider, margin_percentage, min_price, max_price, priority } = req.body as any

  if (!category_name || !provider || margin_percentage === undefined) {
    return res.status(400).json({
      message: 'Missing required fields: category_name, provider, margin_percentage',
    })
  }

  const rule = await pricingSettingsService.createPricingRule({
    category_id,
    category_name,
    provider,
    margin_percentage,
    min_price,
    max_price,
    priority,
  })

  res.status(201).json({ pricing_rule: rule })
}
