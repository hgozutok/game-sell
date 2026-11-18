import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendTemplateEmail, readSmtpSettings } from "../../../utils/email"
import {
  resolveEmailLocaleFromAcceptLanguage,
  toEmailLocale,
} from "../../../modules/email-template/locales"

export const AUTHENTICATE = false

/** POST /store/contact — iletisim formunu destek e-postasina gonderir */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // CORS: yalnizca Medusa'nin STORE_CORS listesindeki origin'ler. Istekteki
    // Origin'i yansitmak, baska sitelerin oturumlu istek atmasina izin verirdi.
    const body = (req.body || {}) as any
    const name = String(body.name || "").trim()
    const email = String(body.email || "").trim()
    const subject = String(body.subject || "İletişim").trim()
    const message = String(body.message || "").trim()

    if (!name || !message) {
      return res.status(400).json({ message: "Ad ve mesaj gerekli" })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ message: "Geçerli bir e-posta girin" })
    }

    const storeSettings = req.scope.resolve("storeSettings") as any
    // Destek adresi panelden tanimlanmamissa SMTP gonderen adresine dus:
    // aksi halde yeni kurulumda iletisim formu sessizce 500 dondurur.
    let recipient = String(
      (await storeSettings.getSettingValue("store.support_email", "")) || ""
    ).trim()
    if (!recipient) {
      recipient = (
        await readSmtpSettings(req.scope).catch(() => null as any)
      )?.from_email || ""
    }
    if (!recipient) {
      return res.status(503).json({
        message:
          "Destek e-postası tanımlı değil. Yönetim panelinden store.support_email ayarlayın.",
      })
    }

    const locale =
      toEmailLocale(body.locale) ||
      resolveEmailLocaleFromAcceptLanguage(req.headers["accept-language"] as string)

    const result = await sendTemplateEmail(req.scope, {
      to: recipient,
      templateKey: "contact-form",
      locale,
      replyTo: email,
      data: { name, email, subject, message },
    })

    if (!result.sent) {
      return res.status(503).json({
        message: result.skipped
          ? "E-posta servisi henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin."
          : "Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.",
        error: result.error,
      })
    }

    res.json({ ok: true, message: "Mesajınız gönderildi" })
  } catch (error: any) {
    res.status(500).json({ message: "Mesaj gönderilemedi", error: error?.message })
  }
}

export const OPTIONS = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.status(204).end()
}
