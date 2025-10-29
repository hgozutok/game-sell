import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export const AUTHENTICATE = false // Disable auth for development

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeSettingsModule = req.scope.resolve('storeSettings') as any
    
    const { category } = req.query

    let settings
    if (category) {
      settings = await storeSettingsModule.listSettingsByCategory(category as string)
    } else {
      settings = await storeSettingsModule.getAllSettings()
    }

    res.json({ settings })
  } catch (error: any) {
    console.error('Admin settings GET error:', error)
    res.status(500).json({ 
      message: 'Failed to fetch settings',
      error: error.message 
    })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeSettingsModule = req.scope.resolve('storeSettings') as any

    const { key, value, category, description } = req.body as any

    if (!key || value === undefined) {
      return res.status(400).json({
        message: 'Missing required fields: key, value',
      })
    }

    const setting = await storeSettingsModule.setSetting(key, value, {
      category,
      description,
    })

    res.json({ setting })
  } catch (error: any) {
    console.error('Admin settings POST error:', error)
    res.status(500).json({ 
      message: 'Failed to save setting',
      error: error.message 
    })
  }
}
