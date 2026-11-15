import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

// POST /store/auth/change-password — giris yapmis musterinin sifre degistirmesi.
// Gecerli JWT zorunlu; mevcut sifre dogrulanir, yeni sifre hash'lenerek yazilir.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger') as any
  const customerId = ((req as any).auth_context?.actor_id ?? (req as any).auth?.actor_id)
  if (!customerId) {
    return res.status(401).json({ code: 'unauthorized', message: 'Oturum gerekli' })
  }

  try {
    const { current_password, new_password } = (req.body || {}) as Record<string, string>
    if (!current_password || !new_password) {
      return res.status(400).json({ code: 'missing_fields', message: 'Mevcut ve yeni şifre gerekli' })
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ code: 'weak_password', message: 'Yeni şifre en az 8 karakter olmalı' })
    }

    const authModule = req.scope.resolve(Modules.AUTH) as any
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const customer = await customerModule.retrieveCustomer(customerId)
    const email = String(customer.email).toLowerCase()

    // mevcut sifreyi dogrula
    const result = await authModule.authenticate('emailpass', {
      url: req.url,
      headers: req.headers,
      query: {},
      body: { email, password: current_password },
      protocol: req.protocol,
    })
    if (!result?.success) {
      return res.status(400).json({ code: 'wrong_password', message: 'Mevcut şifre hatalı' })
    }

    // emailpass provider'in update'i sifreyi hash'leyip yazar
    await authModule.updateProvider('emailpass', {
      entity_id: email,
      password: new_password,
    })

    logger.info(`[auth] sifre degistirildi: ${email}`)
    res.json({ success: true })
  } catch (error: any) {
    logger.warn(`[auth] sifre degistirme hatasi: ${error?.message}`)
    res.status(500).json({ code: 'change_failed', message: 'Şifre değiştirilemedi' })
  }
}
