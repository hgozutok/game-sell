import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { backfillProductImages } from "../../../../utils/kinguin-sync"

const BodySchema = z.object({
  limit: z.number().min(1).max(5000).optional(),
})

// Magazadaki urunlere Kinguin gorsellerini tasi (thumbnail + images + metadata.provider_image)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Geçersiz gövde", errors: parsed.error.flatten() })
  }
  const summary = await backfillProductImages(req.scope, { limit: parsed.data.limit })
  res.json(summary)
}
