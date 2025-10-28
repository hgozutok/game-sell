import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettingsModule = req.scope.resolve('storeSettings') as any
  const { key } = req.params

  const setting = await storeSettingsModule.getSetting(key)

  if (!setting) {
    return res.status(404).json({ message: 'Setting not found' })
  }

  res.json({ setting })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const storeSettingsModule = req.scope.resolve('storeSettings') as any
  const { key } = req.params

  try {
    await storeSettingsModule.deleteSetting(key)
    res.json({ message: 'Setting deleted successfully' })
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete setting', error })
  }
}

