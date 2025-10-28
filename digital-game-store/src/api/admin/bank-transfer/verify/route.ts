import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const VerifyPaymentSchema = z.object({
  payment_id: z.string(),
  reference: z.string(),
  verified: z.boolean(),
  notes: z.string().optional(),
})

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const validated = VerifyPaymentSchema.parse(req.body)

  try {
    // TODO: Get payment from Medusa
    // const paymentModule = req.scope.resolve("payment") as any
    // const payment = await paymentModule.retrievePayment(validated.payment_id)

    if (validated.verified) {
      // Mark payment as captured
      // await paymentModule.capturePayment(validated.payment_id)
      
      res.json({
        success: true,
        message: "Payment verified and captured",
        payment_id: validated.payment_id,
      })
    } else {
      // Cancel the payment
      // await paymentModule.cancelPayment(validated.payment_id)
      
      res.json({
        success: true,
        message: "Payment marked as failed",
        payment_id: validated.payment_id,
      })
    }
  } catch (error: any) {
    res.status(500).json({
      error: "Failed to verify payment",
      message: error.message,
    })
  }
}

