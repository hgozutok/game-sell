import { MedusaService } from "@medusajs/framework/utils"
import { UserPreference } from "./models/user-preference"

class UserPreferencesService extends MedusaService({
  UserPreference,
}) {
  /**
   * Get a preference by key and user_id
   */
  async getPreference(key: string, userId: string | null = null): Promise<any> {
    const preferences = await this.listUserPreferences({ 
      key,
      user_id: userId,
    })
    
    if (preferences.length > 0) {
      return preferences[0]
    }
    
    return null
  }

  /**
   * Get just the value of a preference
   */
  async getPreferenceValue(key: string, userId: string | null = null, defaultValue: any = null): Promise<any> {
    const preference = await this.getPreference(key, userId)
    return preference ? preference.value : defaultValue
  }

  /**
   * Set a preference (create or update)
   */
  async setPreference(
    key: string,
    value: any,
    userId: string | null = null
  ): Promise<any> {
    const existing = await this.getPreference(key, userId)

    if (existing) {
      // Update existing preference
      return await this.updateUserPreferences(existing.id, {
        value,
      })
    }

    // Create new preference
    return await this.createUserPreferences({
      key,
      value,
      user_id: userId,
    })
  }

  /**
   * Delete a preference
   */
  async deletePreference(key: string, userId: string | null = null): Promise<void> {
    const preference = await this.getPreference(key, userId)
    
    if (preference) {
      await this.deleteUserPreferences(preference.id)
    }
  }

  /**
   * Get all preferences for a user
   */
  async getUserPreferences(userId: string | null = null): Promise<any[]> {
    return await this.listUserPreferences({ user_id: userId })
  }

  /**
   * Delete all preferences for a user
   */
  async deleteAllUserPreferences(userId: string | null = null): Promise<void> {
    const preferences = await this.getUserPreferences(userId)
    
    for (const pref of preferences) {
      await this.deleteUserPreferences(pref.id)
    }
  }
}

export default UserPreferencesService

