import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const AUTHENTICATE = false

const KEY_RE = /^[a-z0-9][a-z0-9-_]{1,60}$/

/** GET /admin/email-templates — tum sablonlar (varsayilanlar eksikse olusturulur) */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const emailTemplate = req.scope.resolve("emailTemplate") as any
    await emailTemplate.ensureDefaults()
    const templates = await emailTemplate.listEmailTemplates(
      {},
      { order: { created_at: "ASC" } }
    )
    res.json({ templates })
  } catch (error: any) {
    res.status(500).json({ message: "Şablonlar okunamadı", error: error?.message })
  }
}

/** POST /admin/email-templates — yeni sablon */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const emailTemplate = req.scope.resolve("emailTemplate") as any
    const auditLog = req.scope.resolve("auditLog") as any
    const body = (req.body || {}) as any

    const key = String(body.key || "").trim().toLowerCase()
    const locale = body.locale === "en" ? "en" : "tr"
    const name = String(body.name || "").trim()
    const subject = String(body.subject || "").trim()
    const html = String(body.html || "")

    if (!KEY_RE.test(key)) {
      return res.status(400).json({
        message: "Anahtar 2-61 karakter olmalı; küçük harf, rakam, - ve _ kullanın",
      })
    }
    if (!name || !subject || !html) {
      return res.status(400).json({ message: "Ad, konu ve HTML içeriği gerekli" })
    }

    const existing = await emailTemplate.listEmailTemplates({ key, locale }, { take: 1 })
    if (existing?.length) {
      return res.status(409).json({ message: `Bu anahtar ve dil zaten var: ${key} (${locale})` })
    }

    const template = await emailTemplate.createEmailTemplates({
      key,
      locale,
      name,
      subject,
      html,
      text: body.text ? String(body.text) : null,
      active: body.active !== false,
    })

    await auditLog.log({
      action: "email_template.create",
      entity: "email_template",
      entity_id: template.id,
      diff: { key, locale, name },
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })

    res.status(201).json({ template })
  } catch (error: any) {
    res.status(500).json({ message: "Şablon oluşturulamadı", error: error?.message })
  }
}
