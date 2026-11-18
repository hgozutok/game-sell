import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { token } = (req.body || {}) as Record<string, string>
    if (!token || typeof token !== 'string' || token.length > 200) {
      return res.status(400).json({ code: 'missing_token', message: 'Doğrulama token gerekir' })
    }

    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any

    // Eski surum tum musterileri cekip ilk 1000 kayitta ariyordu; bu, buyuyen
    // veritabaninda dogrulamayi sessizce bozuyordu. Token dogrudan jsonb alaninda
    // aranir (tek sorgu).
    let customerId: string | null = null
    try {
      const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
      const row = await knex('customer')
        .whereNull('deleted_at')
        .whereRaw("metadata->>'email_verification_token' = ?", [token])
        .first('id')
      customerId = row?.id || null
    } catch {
      customerId = null
    }

    if (!customerId) {
      return res.status(400).json({ code: 'invalid_token', message: 'Geçersiz doğrulama bağlantısı' })
    }

    const customer = await customerModule.retrieveCustomer(customerId).catch(() => null)
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

    if (customer.metadata?.email_verified === true) {
      return res.json({ verified: true, email: customer.email })
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
