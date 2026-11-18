import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  buildCustomerStatusMetadata,
  customerAdminView,
  isCustomerDisabled,
} from "../../../../utils/customer-status"

/**
 * POST /admin/customer-control/:id
 * Body: { active: boolean }
 *
 * Musteri hesabini aktif/pasif yapar (customer.metadata.disabled).
 * Pasif hesap giris yapamaz; mevcut oturumlarda siparis/anahtar uclari 403 doner.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve("logger") as any
  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const { id } = req.params
    const body = (req.body || {}) as Record<string, any>

    if (typeof body.active !== "boolean") {
      return res.status(400).json({
        code: "invalid_payload",
        message: "active alanı true veya false olmalı",
      })
    }

    const customer = await customerModule.retrieveCustomer(id).catch(() => null)
    if (!customer) {
      return res.status(404).json({ code: "not_found", message: "Müşteri bulunamadı" })
    }

    const metadata = buildCustomerStatusMetadata(customer.metadata, body.active)
    const updated = await customerModule.updateCustomers(id, { metadata })

    logger.info(
      `[admin] musteri durumu: ${customer.email || id} -> ${body.active ? "aktif" : "pasif"}`
    )

    res.json({
      customer: {
        ...customerAdminView({ ...customer, ...updated, metadata }),
      },
      active: body.active,
      was_active: !isCustomerDisabled(customer.metadata),
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Müşteri durumu güncellenemedi",
      error: error?.message,
    })
  }
}
