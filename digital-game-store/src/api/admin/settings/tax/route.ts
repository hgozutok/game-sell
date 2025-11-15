import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

const TAX_RATE_KEY = 'tax.rate'
const DEFAULT_TAX_RATE = 20

export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettings = req.scope.resolve('storeSettings') as any
  const taxRate = await storeSettings.getSettingValue(TAX_RATE_KEY, DEFAULT_TAX_RATE)

  res.json({
    tax_rate: typeof taxRate === 'number' ? taxRate : parseFloat(taxRate) || DEFAULT_TAX_RATE,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettings = req.scope.resolve('storeSettings') as any
  const { tax_rate } = req.body as any

  if (tax_rate === undefined || tax_rate === null || isNaN(Number(tax_rate))) {
    return res.status(400).json({
      message: 'tax_rate is required and must be a number',
    })
  }

  const parsedRate = Math.max(0, Number(tax_rate))

  await storeSettings.setSetting(TAX_RATE_KEY, parsedRate, {
    category: 'tax',
    description: 'Default storefront tax rate (%)',
  })

  res.json({
    message: 'Tax rate updated',
    tax_rate: parsedRate,
  })
}

