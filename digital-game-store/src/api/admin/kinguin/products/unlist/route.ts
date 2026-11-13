import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { unlistKinguinProduct, KinguinProductRow } from "../../../../../utils/kinguin-sync"

const BodySchema = z.object({ ids: z.array(z.string()).min(1).max(200) })

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = BodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "Geçersiz gövde", errors: parsed.error.flatten() })
  }
  const kinguin = req.scope.resolve("kinguin") as any

  let removed = 0
  for (const id of parsed.data.ids) {
    const rows = await kinguin.listKinguinProducts({ id })
    const kp = rows?.[0]
    if (kp) {
      await unlistKinguinProduct(req.scope, kp as KinguinProductRow)
      removed++
    }
  }
  res.json({ total: parsed.data.ids.length, unlisted: removed })
}
