import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  readSmtpSettings,
  encodePassword,
  SMTP_SETTING_KEYS,
} from "../../../utils/email"

export const AUTHENTICATE = false

/** GET /admin/email-settings — SMTP ayarlari (sifre asla donmez) */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const smtp = await readSmtpSettings(req.scope)
    const storeSettings = req.scope.resolve("storeSettings") as any
    const language = await storeSettings.getSettingValue("email.language", "tr")
    res.json({
      settings: {
        enabled: smtp.enabled,
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        user: smtp.user,
        from_email: smtp.from_email,
        from_name: smtp.from_name,
        language: language === "en" ? "en" : "tr",
      },
      password_set: Boolean(smtp.password),
    })
  } catch (error: any) {
    res.status(500).json({ message: "SMTP ayarları okunamadı", error: error?.message })
  }
}

/** POST /admin/email-settings — SMTP ayarlarini kaydet */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const storeSettings = req.scope.resolve("storeSettings") as any
    const auditLog = req.scope.resolve("auditLog") as any
    const body = (req.body || {}) as any

    const enabled = body.enabled === true || body.enabled === "true"
    const host = String(body.host || "").trim()
    const port = Number(body.port) || 587
    const secure = body.secure === true || body.secure === "true"
    const user = String(body.user || "").trim()
    const fromEmail = String(body.from_email || "").trim()
    const fromName = String(body.from_name || "").trim()
    const language = body.language === "en" ? "en" : "tr"

    if (enabled) {
      if (!host) {
        return res.status(400).json({ message: "SMTP sunucusu (host) gerekli" })
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromEmail)) {
        return res.status(400).json({ message: "Geçerli bir gönderen e-postası girin" })
      }
      if (!user) {
        return res.status(400).json({ message: "SMTP kullanıcı adı gerekli" })
      }
    }

    const entries: Array<[string, any]> = [
      [SMTP_SETTING_KEYS.enabled, enabled],
      [SMTP_SETTING_KEYS.host, host],
      [SMTP_SETTING_KEYS.port, port],
      [SMTP_SETTING_KEYS.secure, secure],
      [SMTP_SETTING_KEYS.user, user],
      [SMTP_SETTING_KEYS.fromEmail, fromEmail],
      [SMTP_SETTING_KEYS.fromName, fromName],
      ["email.language", language],
    ]

    for (const [key, value] of entries) {
      await storeSettings.setSetting(key, value, { category: "email" })
    }

    // Bos sifre = mevcut sifreyi koru; clear_password=true ile sil
    const newPassword = String(body.password || "")
    if (body.clear_password === true) {
      await storeSettings.setSetting(SMTP_SETTING_KEYS.password, "", { category: "email" })
    } else if (newPassword) {
      await storeSettings.setSetting(
        SMTP_SETTING_KEYS.password,
        encodePassword(newPassword),
        { category: "email" }
      )
    }

    await auditLog.log({
      action: "email.smtp_update",
      entity: "email_settings",
      diff: { enabled, host, port, secure, user, from_email: fromEmail, language },
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })

    res.json({ ok: true, message: "SMTP ayarları kaydedildi" })
  } catch (error: any) {
    res.status(500).json({ message: "SMTP ayarları kaydedilemedi", error: error?.message })
  }
}
