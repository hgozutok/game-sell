import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'


export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
    }
    const storeSettingsModule = req.scope.resolve('storeSettings') as any
    
    const { category } = req.query

    let settings
    if (category) {
      settings = await storeSettingsModule.listSettingsByCategory(category as string)
    } else {
      settings = await storeSettingsModule.getAllSettings()
    }

    // Gizli anahtar bu herkese acik uctan donmez; yalnizca /admin/admin-access.
    settings = (settings || []).filter((item: any) => item?.key !== 'admin.access_key')

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
    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-publishable-api-key')
    }
    const storeSettingsModule = req.scope.resolve('storeSettings') as any

    const { key, value, category, description } = req.body as any

    // Admin giris anahtari bu herkese acik uctan yazilamaz (bkz. /admin/admin-access).
    if (key === 'admin.access_key') {
      return res.status(403).json({ message: 'Bu ayar /admin/admin-access uzerinden degistirilir' })
    }

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
