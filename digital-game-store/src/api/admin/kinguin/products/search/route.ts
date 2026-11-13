import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const BodySchema = z.object({
  query: z.string().min(3).max(100),
  page: z.number().min(1).optional(),
})

// Canli Kinguin aramasi — sonuclar yerel katalogu da gunceller.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "En az 3 karakter", errors: parsed.error.flatten() })
  }

  const kinguin = req.scope.resolve("kinguin") as any
  try {
    const result = await kinguin.listProducts({
      name: parsed.data.query,
      page: parsed.data.page ?? 1,
      limit: 20,
    })
    // Bulunanlari yerel katalogla senkronize et (admin katalog sayfasinda aninda gorunur)
    for (const p of result.results) {
      await kinguin.upsertLocalProduct(p).catch(() => null)
    }
    res.json({
      products: result.results.map((p: any) => ({ ...p, price_minor: Math.round(p.price * 100) })),
      itemCount: result.itemCount,
    })
  } catch (e: any) {
    res.status(502).json({ message: `Kinguin arama hatasi: ${e?.message}` })
  }
}
