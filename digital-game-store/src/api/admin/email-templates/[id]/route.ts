import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const AUTHENTICATE = false

/** GET /admin/email-templates/:id */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const emailTemplate = req.scope.resolve("emailTemplate") as any
    const template = await emailTemplate.retrieveEmailTemplate(req.params.id)
    res.json({ template })
  } catch (error: any) {
    res.status(404).json({ message: "Şablon bulunamadı", error: error?.message })
  }
}

/** POST /admin/email-templates/:id — guncelle */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const emailTemplate = req.scope.resolve("emailTemplate") as any
    const auditLog = req.scope.resolve("auditLog") as any
    const body = (req.body || {}) as any

    const data: Record<string, any> = {}
    if (body.name !== undefined) data.name = String(body.name)
    if (body.subject !== undefined) data.subject = String(body.subject)
    if (body.html !== undefined) data.html = String(body.html)
    if (body.text !== undefined) data.text = body.text ? String(body.text) : null
    if (body.active !== undefined) data.active = body.active !== false

    if (data.subject !== undefined && !String(data.subject).trim()) {
      return res.status(400).json({ message: "Konu boş olamaz" })
    }
    if (data.html !== undefined && !String(data.html).trim()) {
      return res.status(400).json({ message: "HTML içeriği boş olamaz" })
    }

    const template = await emailTemplate.updateEmailTemplates({
      id: req.params.id,
      ...data,
    })

    await auditLog.log({
      action: "email_template.update",
      entity: "email_template",
      entity_id: req.params.id,
      diff: data,
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })

    res.json({ template })
  } catch (error: any) {
    res.status(500).json({ message: "Şablon güncellenemedi", error: error?.message })
  }
}

/** DELETE /admin/email-templates/:id */
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const emailTemplate = req.scope.resolve("emailTemplate") as any
    const auditLog = req.scope.resolve("auditLog") as any

    await emailTemplate.deleteEmailTemplates(req.params.id)

    await auditLog.log({
      action: "email_template.delete",
      entity: "email_template",
      entity_id: req.params.id,
      actor_id: (req as any).auth_context?.actor_id ?? null,
      ip: req.headers?.["x-forwarded-for"] ?? null,
    })

    res.json({ ok: true })
  } catch (error: any) {
    res.status(500).json({ message: "Şablon silinemedi", error: error?.message })
  }
}
