import { MedusaService } from "@medusajs/framework/utils"
import StoreSetting from "./models/store-setting"

class StoreSettingsService extends MedusaService({
  StoreSetting,
}) {
  async getSetting(key: string): Promise<any> {
    const settings = await this.listStoreSettings({ key })
    
    if (settings.length > 0) {
      return settings[0]
    }
    
    return null
  }

  async getSettingValue(key: string, defaultValue: any = null): Promise<any> {
    const setting = await this.getSetting(key)
    return setting ? setting.value : defaultValue
  }

  async setSetting(
    key: string,
    value: any,
    options: {
      category?: string
      description?: string
    } = {}
  ): Promise<any> {
    const existing = await this.getSetting(key)

    if (existing) {
      // Delete existing and create new (simpler than update)
      await this.deleteStoreSettings(existing.id)
    }

    return await this.createStoreSettings({
      key,
      value,
      category: options.category || "general",
      description: options.description || null,
    })
  }

  async listSettingsByCategory(category: string): Promise<any[]> {
    return await this.listStoreSettings({ category })
  }

  async getAllSettings(): Promise<any[]> {
    return await this.listStoreSettings({})
  }

  async deleteSetting(key: string): Promise<void> {
    const setting = await this.getSetting(key)
    
    if (setting) {
      await this.deleteStoreSettings({ id: setting.id })
    }
  }

  // Convenience methods for common settings
  async getThemeSettings(): Promise<any> {
    return {
      headerLogo: await this.getSettingValue("theme.header.logo"),
      headerBgColor: await this.getSettingValue("theme.header.bgColor", "#15171c"),
      footerText: await this.getSettingValue("theme.footer.text"),
      primaryColor: await this.getSettingValue("theme.primaryColor", "#ff6b35"),
      secondaryColor: await this.getSettingValue("theme.secondaryColor", "#f7931e"),
    }
  }

  async setThemeSetting(key: string, value: any): Promise<any> {
    return await this.setSetting(`theme.${key}`, value, { category: "theme" })
  }
}

export default StoreSettingsService

