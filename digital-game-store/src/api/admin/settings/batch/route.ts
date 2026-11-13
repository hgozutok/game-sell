import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const AUTHENTICATE = false

type SettingInput = {
  key: string
  value: any
  category?: string
  description?: string
}

/**
 * POST /admin/settings/batch
 * Birden fazla ayarı tek istekte kaydeder.
 * Body: { settings: [{ key, value, category?, description? }] }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeSettings = req.scope.resolve("storeSettings") as any
    const body = (req.body || {}) as any
    const settings: SettingInput[] = Array.isArray(body.settings) ? body.settings : []

    if (settings.length === 0) {
      return res.status(400).json({ message: "settings dizisi gerekli" })
    }

    const saved: any[] = []
    for (const item of settings) {
      if (!item?.key || item.value === undefined) continue
      const setting = await storeSettings.setSetting(item.key, item.value, {
        category: item.category,
        description: item.description,
      })
      saved.push(setting)
    }

    res.json({ saved: saved.length, settings: saved })
  } catch (error: any) {
    console.error("Admin settings batch POST error:", error)
    res.status(500).json({
      message: "Ayarlar kaydedilemedi",
      error: error?.message,
    })
  }
}
