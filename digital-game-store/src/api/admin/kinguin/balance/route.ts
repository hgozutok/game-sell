import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Kinguin bakiyesi (EUR). Admin panel uyarilari icin.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const kinguin = req.scope.resolve("kinguin") as any
  try {
    const balance = await kinguin.getBalance()
    const settings = await kinguin.getSettings()
    res.json({
      ...balance,
      min_balance: settings.min_balance,
      order_mode: settings.order_mode,
      low_balance: balance.balance < (settings.min_balance ?? 0),
    })
  } catch (e: any) {
    res.status(502).json({ message: `Kinguin bakiye hatasi: ${e?.message}` })
  }
}
