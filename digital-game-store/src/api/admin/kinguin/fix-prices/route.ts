import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { updateVariantPrice, computePriceForKinguinProduct, KinguinProductRow } from "../../../../utils/kinguin-sync"

const BodySchema = z.object({
  limit: z.number().min(1).max(5000).optional(),
})

// Fiyatsiz varyantlari fiyatlandir — eski importlarda varyant fiyati atlanmisti.
// fiyat motoru (marj kurali + kur + yuvarlama) kinguin_product maliyetinden hesaplar.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Geçersiz gövde", errors: parsed.error.flatten() })
  }
  const limit = parsed.data.limit ?? 2000

  const kinguin = req.scope.resolve("kinguin") as any
  const productModule = req.scope.resolve("product") as any
  const settings = await kinguin.getSettings()

  const products = await productModule.listProducts(
    {},
    { take: limit, relations: ["variants"] }
  )

  let fixed = 0
  let skipped = 0
  const details: string[] = []

  for (const p of products as any[]) {
    try {
      const meta = p.metadata || {}
      if (meta.provider !== "kinguin" && !meta.kinguin_id) {
        skipped++
        continue
      }
      const kpRows = meta.kinguin_id
        ? await kinguin.listKinguinProducts({ kinguin_id: String(meta.kinguin_id) })
        : await kinguin.listKinguinProducts({ medusa_product_id: p.id })
      const kp = (kpRows || [])[0] as KinguinProductRow | undefined
      if (!kp) {
        skipped++
        continue
      }

      const computed = await computePriceForKinguinProduct(req.scope, kp, settings)
      if (computed.negative) {
        skipped++
        continue
      }

      for (const variant of p.variants || []) {
        const current = (variant.prices || []).find(
          (pr: any) => pr.currency_code === "usd"
        )
        if (!current || Number(current.amount) === 0) {
          await updateVariantPrice(req.scope, variant.id, Math.round(computed.sellMinor))
          fixed++
        }
      }
    } catch (e: any) {
      if (details.length < 10) details.push(`${p.id}: ${e?.message}`)
    }
  }

  res.json({ fixed, skipped, total: products.length, details })
}
