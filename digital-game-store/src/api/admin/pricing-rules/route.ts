import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

export const AUTHENTICATE = false // Disable auth for development

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pricingSettings = req.scope.resolve('pricingSettings') as any
  
    const { provider, category_id, is_active } = req.query

    const rules = await pricingSettings.getAllPricingRules({
      ...(provider && { provider }),
      ...(category_id && { category_id }),
      ...(is_active !== undefined && { is_active: is_active === 'true' }),
    })

    res.json({ pricing_rules: rules || [] })
  } catch (error: any) {
    console.error('Pricing rules GET error:', error)
    res.json({ pricing_rules: [] })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pricingSettings = req.scope.resolve('pricingSettings') as any

    const { category_id, category_name, provider, margin_percentage, min_price, max_price, priority } = req.body as any

    if (!category_name || margin_percentage === undefined) {
      return res.status(400).json({
        message: 'Missing required fields: category_name, margin_percentage',
      })
    }

    const rule = await pricingSettings.createPricingRule({
      category_id,
      category_name,
      provider: provider || 'all',
      margin_percentage,
      min_price,
      max_price,
      priority: priority || 0,
    })

    res.status(201).json({ pricing_rule: rule })
  } catch (error: any) {
    console.error('Pricing rules POST error:', error)
    res.status(500).json({ 
      message: 'Failed to create pricing rule',
      error: error.message 
    })
  }
}
