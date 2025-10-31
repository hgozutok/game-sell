import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import StoreSettingsService from '../../../modules/store-settings/service'

export const AUTHENTICATE = false

// GET /admin/payment-settings - Get all payment settings
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const storeSettings = req.scope.resolve('storeSettings') as StoreSettingsService

    // Get all payment-related settings
    const paymentSettings = await storeSettings.listSettingsByCategory('payment')

    // Format response
    const settings: any = {
      stripe: { active: false, config: {} },
      paypal: { active: false, config: {} },
      mollie: { active: false, config: {} },
      bank_transfer: { active: true, config: {} }, // Always active
      crypto: { active: false, config: {} },
    }

    paymentSettings.forEach((setting: any) => {
      const parts = setting.key.split('.')
      if (parts.length >= 3) {
        const provider = parts[1] // e.g., "stripe", "paypal"
        const field = parts[2] // e.g., "active", "public_key"
        
        if (!settings[provider]) {
          settings[provider] = { active: false, config: {} }
        }
        
        if (field === 'active') {
          settings[provider].active = setting.value
        } else {
          settings[provider].config[field] = setting.value
        }
      }
    })

    res.json({
      settings,
    })
  } catch (error: any) {
    console.error('Failed to fetch payment settings:', error)
    res.status(500).json({
      message: 'Failed to fetch payment settings',
      error: error.message,
    })
  }
}

// POST /admin/payment-settings - Save payment settings
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const storeSettings = req.scope.resolve('storeSettings') as StoreSettingsService
    const { provider, active, config } = req.body as any

    if (!provider) {
      return res.status(400).json({
        message: 'Provider is required',
      })
    }

    // Save active status
    await storeSettings.setSetting(
      `payment.${provider}.active`,
      active || false,
      { category: 'payment' }
    )

    // Save configuration fields
    if (config && typeof config === 'object') {
      for (const [key, value] of Object.entries(config)) {
        await storeSettings.setSetting(
          `payment.${provider}.${key}`,
          value,
          { category: 'payment' }
        )
      }
    }

    res.json({
      message: `${provider} payment settings saved successfully`,
      provider,
      active,
    })
  } catch (error: any) {
    console.error('Failed to save payment settings:', error)
    res.status(500).json({
      message: 'Failed to save payment settings',
      error: error.message,
    })
  }
}

