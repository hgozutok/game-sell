import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import StoreSettingsService from '../../../modules/store-settings/service'

export const AUTHENTICATE = false

// GET /store/payment-methods - Get active payment methods for checkout
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
    }
    const storeSettings = req.scope.resolve('storeSettings') as StoreSettingsService

    // Get all payment-related settings
    const paymentSettings = await storeSettings.listSettingsByCategory('payment')

    // Parse settings — varsayilan olarak banka havalesi acik
    const methods: any = {
      stripe: { active: false },
      paypal: { active: false },
      mollie: { active: false },
      bank_transfer: { active: true },
    }

    paymentSettings.forEach((setting: any) => {
      const parts = setting.key.split('.')
      if (parts.length >= 3 && parts[0] === 'payment') {
        const provider = parts[1]
        const field = parts[2]
        
        if (field === 'active' && methods[provider]) {
          methods[provider].active = setting.value === true || setting.value === 'true'
        }
      }
    })

    // Stripe sadece anahtar tanimliysa listelenir (aksi halde oturum acilamaz)
    const stripeConfigured = Boolean(process.env.STRIPE_API_KEY)

    // Return only active methods
    const activeMethods = Object.entries(methods)
      .filter(([id, data]: any) => {
        if (!data.active) return false
        if (id === 'stripe') return stripeConfigured
        return true
      })
      .map(([id, _]) => ({
        id,
        name: id === 'paypal' ? 'PayPal' : 
              id === 'mollie' ? 'Mollie' : 
              id === 'stripe' ? 'Kredi Karti (Stripe)' :
              id === 'bank_transfer' ? 'Bank Transfer' : id,
      }))

    res.json({
      methods: activeMethods,
      stripe_publishable_key: await storeSettings.getSettingValue(
        'payment.stripe.publishable_key',
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
      ),
    })
  } catch (error: any) {
    console.error('Failed to fetch payment methods:', error)
    // Return bank_transfer as fallback
    res.json({
      methods: [{ id: 'bank_transfer', name: 'Bank Transfer' }],
    })
  }
}

export async function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
  }
  res.status(204).end()
}

