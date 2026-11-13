import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendTemplateEmail } from "../../../utils/email"

export const AUTHENTICATE = false

/** POST /store/contact — iletisim formunu destek e-postasina gonderir */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin)
      res.setHeader("Access-Control-Allow-Credentials", "true")
      res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-publishable-api-key")
    }

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
    const recipient = await storeSettings.getSettingValue("store.support_email", "")
    if (!recipient) {
      return res.status(500).json({ message: "Destek e-postası tanımlı değil" })
    }

    const result = await sendTemplateEmail(req.scope, {
      to: recipient,
      templateKey: "contact-form",
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

export const OPTIONS = async (req: MedusaRequest, res: MedusaResponse) => {
  const originHeader = req.headers.origin
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-publishable-api-key")
  }
  res.status(204).end()
}
