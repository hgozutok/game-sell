import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { reconcileKinguinListings } from "../../../../utils/kinguin-sync"

/**
 * POST /admin/kinguin/reconcile
 *
 * Magaza urunleri ile Kinguin katalog kayitlarini esitler:
 * - Medusa'da yayinda olan urun -> Kinguin kaydi store_listed=true + baglanti
 * - Taslak/silinmis urun -> Kinguin kaydi store_listed=false
 * Katalogdan yeni urun import etmez; yalnizca mevcut kayitlarin durumunu duzeltir.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const summary = await reconcileKinguinListings(req.scope)
    res.json({ ok: true, ...summary })
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e?.message || "Eşitleme başarısız" })
  }
}
