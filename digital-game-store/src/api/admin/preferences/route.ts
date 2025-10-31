import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import UserPreferencesService from '../../../modules/user-preferences/service'

// Disable authentication for development
export const AUTHENTICATE = false

// GET /admin/preferences - Get all preferences
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const userPreferencesService = req.scope.resolve('userPreferences') as UserPreferencesService
    const { key } = req.query

    if (key) {
      // Get specific preference by key
      const preference = await userPreferencesService.getPreference(key as string)
      
      if (!preference) {
        return res.status(404).json({
          message: 'Preference not found',
        })
      }

      return res.json({
        preference,
      })
    }

    // Get all preferences
    const preferences = await userPreferencesService.getUserPreferences()

    res.json({
      preferences,
      count: preferences.length,
    })
  } catch (error: any) {
    console.error('Failed to fetch preferences:', error)
    res.status(500).json({
      message: 'Failed to fetch preferences',
      error: error.message,
    })
  }
}

// POST /admin/preferences - Create or update a preference
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const userPreferencesService = req.scope.resolve('userPreferences') as UserPreferencesService
    const { key, value } = req.body as any

    if (!key) {
      return res.status(400).json({
        message: 'Missing required field: key',
      })
    }

    const preference = await userPreferencesService.setPreference(key, value)

    res.status(200).json({
      message: 'Preference saved successfully',
      preference,
    })
  } catch (error: any) {
    console.error('Failed to save preference:', error)
    res.status(500).json({
      message: 'Failed to save preference',
      error: error.message,
    })
  }
}

// DELETE /admin/preferences - Delete a preference
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const userPreferencesService = req.scope.resolve('userPreferences') as UserPreferencesService
    const { key } = req.query

    if (!key) {
      return res.status(400).json({
        message: 'Missing required parameter: key',
      })
    }

    await userPreferencesService.deletePreference(key as string)

    res.json({
      message: 'Preference deleted successfully',
    })
  } catch (error: any) {
    console.error('Failed to delete preference:', error)
    res.status(500).json({
      message: 'Failed to delete preference',
      error: error.message,
    })
  }
}

