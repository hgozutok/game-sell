import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import StoreSettingsService from '../../../modules/store-settings/service'

export const AUTHENTICATE = false

// GET /store/payment-methods - Get active payment methods for checkout
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const storeSettings = req.scope.resolve('storeSettings') as StoreSettingsService

    // Get all payment-related settings
    const paymentSettings = await storeSettings.listSettingsByCategory('payment')

    // Parse settings
    const methods: any = {
      paypal: { active: false },
      mollie: { active: false },
      bank_transfer: { active: true }, // Always available
    }

    paymentSettings.forEach((setting: any) => {
      const parts = setting.key.split('.')
      if (parts.length >= 3 && parts[0] === 'payment') {
        const provider = parts[1]
        const field = parts[2]
        
        if (field === 'active' && methods[provider]) {
          methods[provider].active = setting.value
        }
      }
    })

    // Return only active methods
    const activeMethods = Object.entries(methods)
      .filter(([_, data]: any) => data.active)
      .map(([id, _]) => ({
        id,
        name: id === 'paypal' ? 'PayPal' : 
              id === 'mollie' ? 'Mollie' : 
              id === 'bank_transfer' ? 'Bank Transfer' : id,
      }))

    res.json({
      methods: activeMethods,
    })
  } catch (error: any) {
    console.error('Failed to fetch payment methods:', error)
    // Return bank_transfer as fallback
    res.json({
      methods: [{ id: 'bank_transfer', name: 'Bank Transfer' }],
    })
  }
}

