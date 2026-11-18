import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendTemplateEmail } from "../../../../utils/email"
import {
  normalizeEmailLocale,
  toEmailLocale,
} from "../../../../modules/email-template/locales"


/** POST /admin/email-settings/test — kayitli SMTP ayarlariyla test maili gonderir */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const to = String((req.body as any)?.to || "").trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return res.status(400).json({ message: "Geçerli bir alıcı e-postası girin" })
    }

    const storeSettings = req.scope.resolve("storeSettings") as any
    const defaultLanguage = normalizeEmailLocale(
      await storeSettings.getSettingValue("email.language", "en")
    )
    const locale =
      toEmailLocale((req.body as any)?.locale) || defaultLanguage

    const result = await sendTemplateEmail(req.scope, {
      to,
      templateKey: "smtp-test",
      locale,
      data: {},
    })

    if (!result.sent) {
      return res.status(400).json({
        ok: false,
        message: result.skipped
          ? "SMTP kapalı veya eksik. Önce ayarları kaydedip etkinleştirin."
          : `Gönderim başarısız: ${result.error}`,
      })
    }

    res.json({ ok: true, message: `Test e-postası gönderildi: ${to}`, message_id: result.messageId })
  } catch (error: any) {
    res.status(500).json({ message: "Test e-postası gönderilemedi", error: error?.message })
  }
}
