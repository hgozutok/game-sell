import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { renderEmailString } from "../../../../modules/email-template/service"
import { buildTableHtml, escapeHtmlValue } from "../../../../utils/email"

export const AUTHENTICATE = false

/** POST /admin/email-templates/preview — sablonu ornek veriyle render eder */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const body = (req.body || {}) as any
    const html = String(body.html || "")
    const subject = String(body.subject || "")
    const customData = body.data && typeof body.data === "object" ? body.data : {}

    const storeSettings = req.scope.resolve("storeSettings") as any
    const storeName = await storeSettings.getSettingValue("store.name", "Mağaza")
    const supportEmail = await storeSettings.getSettingValue(
      "store.support_email",
      "support@example.com"
    )

    const keysHtml = buildTableHtml(
      [
        { title: "Örnek Oyun — Steam CD Key", code: "AAAA-BBBB-CCCC-DDDD" },
        { title: "Örnek Oyun 2 — Epic Key", code: "EEEE-FFFF-GGGG-HHHH" },
      ].map((row) => ({
        title: escapeHtmlValue(row.title),
        code: `<code style="font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtmlValue(row.code)}</code>`,
      })),
      [
        { key: "title", label: "Ürün" },
        { key: "code", label: "Anahtar" },
      ]
    )

    const itemsHtml = buildTableHtml(
      [
        { title: "Örnek Oyun", quantity: "1", total: "₺499,00" },
        { title: "Örnek Oyun 2", quantity: "2", total: "₺299,00" },
      ].map((row) => ({
        title: escapeHtmlValue(row.title),
        quantity: escapeHtmlValue(row.quantity),
        total: escapeHtmlValue(row.total),
      })),
      [
        { key: "title", label: "Ürün" },
        { key: "quantity", label: "Adet", align: "right" },
        { key: "total", label: "Tutar", align: "right" },
      ]
    )

    const data: Record<string, any> = {
      store_name: storeName,
      support_email: supportEmail,
      site_url: "http://localhost:3000",
      year: new Date().getFullYear(),
      now: new Date().toLocaleString("tr-TR"),
      customer_name: "Ahmet Yılmaz",
      order_number: "1042",
      total: "₺798,00",
      currency: "TRY",
      name: "Ahmet Yılmaz",
      email: "ahmet@example.com",
      message: "Merhaba, siparişim hakkında bilgi almak istiyorum.",
      keys_html: keysHtml,
      items_html: itemsHtml,
      ...customData,
    }

    res.json({
      subject: renderEmailString(subject, data, { escape: false }),
      html: renderEmailString(html, data, { escape: true }),
      data,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Önizleme oluşturulamadı", error: error?.message })
  }
}
