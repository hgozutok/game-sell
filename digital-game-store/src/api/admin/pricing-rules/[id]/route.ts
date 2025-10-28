import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pricingSettingsService = req.scope.resolve('pricingSettingsService') as any
  const { id } = req.params

  const rule = await pricingSettingsService.getPricingRule(id)

  if (!rule) {
    return res.status(404).json({ message: 'Pricing rule not found' })
  }

  res.json({ pricing_rule: rule })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pricingSettingsService = req.scope.resolve('pricingSettingsService') as any
  const { id } = req.params

  const { margin_percentage, min_price, max_price, is_active, priority } = req.body as any

  try {
    const rule = await pricingSettingsService.updatePricingRule(id, {
      ...(margin_percentage !== undefined && { margin_percentage }),
      ...(min_price !== undefined && { min_price }),
      ...(max_price !== undefined && { max_price }),
      ...(is_active !== undefined && { is_active }),
      ...(priority !== undefined && { priority }),
    })

    res.json({ pricing_rule: rule })
  } catch (error) {
    res.status(400).json({ message: 'Failed to update pricing rule', error })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pricingSettingsService = req.scope.resolve('pricingSettingsService') as any
  const { id } = req.params

  try {
    await pricingSettingsService.deletePricingRule(id)
    res.json({ message: 'Pricing rule deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete pricing rule', error })
  }
}
