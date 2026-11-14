import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { token } = (req.body || {}) as Record<string, string>
    if (!token) {
      return res.status(400).json({ code: 'missing_token', message: 'Doğrulama token gerekli' })
    }

    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    // token metadata'da saklanir (24s gecerli) — taranip eslesen musteri bulunur
    const candidates = await customerModule.listCustomers(
      {},
      { take: 1000, order: { created_at: 'DESC' } }
    )
    const customer = (candidates || []).find(
      (c: any) => c.metadata?.email_verification_token === token
    )

    if (!customer) {
      return res.status(400).json({ code: 'invalid_token', message: 'Geçersiz doğrulama bağlantısı' })
    }
    const expires = customer.metadata?.email_verification_expires
    if (expires && new Date(expires).getTime() < Date.now()) {
      return res.status(400).json({
        code: 'expired_token',
        message: 'Doğrulama bağlantısının süresi dolmuş. Yeni bir bağlantı talep edin.',
      })
    }

    await customerModule.updateCustomers(customer.id, {
      metadata: {
        ...(customer.metadata || {}),
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        email_verification_token: null,
        email_verification_expires: null,
      },
    })

    res.json({ verified: true, email: customer.email })
  } catch (error: any) {
    res.status(500).json({ code: 'verify_failed', message: 'Doğrulama yapılamadı' })
  }
}
