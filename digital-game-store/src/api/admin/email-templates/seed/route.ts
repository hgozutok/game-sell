import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const AUTHENTICATE = false

/** POST /admin/email-templates/seed — eksik varsayilan sablonlari yukler */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const emailTemplate = req.scope.resolve("emailTemplate") as any
    const result = await emailTemplate.ensureDefaults()
    res.json({
      ok: true,
      created: result.created,
      existing: result.existing,
      message:
        result.created > 0
          ? `${result.created} varsayılan şablon eklendi`
          : "Tüm varsayılan şablonlar zaten mevcut",
    })
  } catch (error: any) {
    res.status(500).json({ message: "Varsayılan şablonlar yüklenemedi", error: error?.message })
  }
}
