import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export const AUTHENTICATE = false // Disable auth for development

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pricingSettings = req.scope.resolve('pricingSettings') as any
    const { id } = req.params

    const rule = await pricingSettings.getPricingRule(id)

    if (!rule) {
      return res.status(404).json({ message: 'Pricing rule not found' })
    }

    res.json({ pricing_rule: rule })
  } catch (error: any) {
    console.error('Pricing rule GET error:', error)
    res.status(500).json({ message: 'Failed to fetch pricing rule', error: error.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pricingSettings = req.scope.resolve('pricingSettings') as any
    const { id } = req.params

    const { margin_percentage, min_price, max_price, is_active, priority } = req.body as any

    const rule = await pricingSettings.updatePricingRule(id, {
      ...(margin_percentage !== undefined && { margin_percentage }),
      ...(min_price !== undefined && { min_price }),
      ...(max_price !== undefined && { max_price }),
      ...(is_active !== undefined && { is_active }),
      ...(priority !== undefined && { priority }),
    })

    res.json({ pricing_rule: rule })
  } catch (error: any) {
    console.error('Pricing rule POST error:', error)
    res.status(500).json({ message: 'Failed to update pricing rule', error: error.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pricingSettings = req.scope.resolve('pricingSettings') as any
    const { id } = req.params

    await pricingSettings.deletePricingRule(id)
    res.json({ message: 'Pricing rule deleted successfully' })
  } catch (error: any) {
    console.error('Pricing rule DELETE error:', error)
    res.status(500).json({ message: 'Failed to delete pricing rule', error: error.message })
  }
}
