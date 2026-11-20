import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  addDomainToBlacklist,
  addEmailToBlacklist,
  getEmailBlacklist,
  removeDomainFromBlacklist,
  removeEmailFromBlacklist,
} from "../../../utils/email-blacklist"
import {
  buildCustomerStatusMetadata,
  customerAdminView,
} from "../../../utils/customer-status"

/**
 * E-posta / alan adi kara listesi yonetimi (admin Kullanicilar sayfasi).
 *
 * GET    /admin/email-blacklist            -> { emails, domains }
 * POST   /admin/email-blacklist            -> body:
 *   { email: "a@b.com" }                   -> tek e-posta ekle
 *   { domain: "mailinator.com" }           -> tek alan adi ekle
 *   { customerId, blockDomain?: boolean }  -> kayitli kullaniciyi engelle:
 *        e-postasini (+ istenirse alan adini) kara listeye ekler VE hesabi
 *        pasiflestirir (acik oturumlar da kesilir)
 * DELETE /admin/email-blacklist?email=...  -> e-postayi cikar
 * DELETE /admin/email-blacklist?domain=... -> alan adini cikar
 *
 * Kara liste kayit, giris ve siparis akislarinda uygulanir (email-blacklist util).
 * Cikarma, hesabi otomatik aktifleştirmez — gerekirse Kullanicilar sayfasindan
 * "Aktifleştir" yapilir.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const blacklist = await getEmailBlacklist(req.scope)
    res.json({
      emails: blacklist.emails,
      domains: blacklist.domains,
    })
  } catch (error: any) {
    res.status(500).json({ message: "Kara liste okunamadı", error: error?.message })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve("logger") as any
  try {
    const body = (req.body || {}) as Record<string, any>
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const domain = typeof body.domain === "string" ? body.domain.trim() : ""
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : ""
    const blockDomain = body.blockDomain === true

    // 1) Kayitli kullaniciyi engelle: kara liste + hesap pasif
    if (customerId) {
      const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
      const customer = await customerModule.retrieveCustomer(customerId).catch(() => null)
      if (!customer) {
        return res.status(404).json({ code: "not_found", message: "Müşteri bulunamadı" })
      }

      const customerEmail = String(customer.email || "").toLowerCase().trim()
      await addEmailToBlacklist(req.scope, customerEmail)
      if (blockDomain) {
        const emailDomain = customerEmail.split("@")[1] || ""
        if (emailDomain) await addDomainToBlacklist(req.scope, emailDomain)
      }

      // Hesabi da pasiflestir — acik oturumlarda siparis/anahtar uclari kapanir.
      if (!customer.metadata?.disabled) {
        const metadata = buildCustomerStatusMetadata(customer.metadata, false)
        await customerModule.updateCustomers(customer.id, { metadata })
      }

      logger.info(
        `[admin] kullanici kara listeye alindi: ${customerEmail}` +
          `${blockDomain ? ` (+ alan adi ${customerEmail.split("@")[1]})` : ""}`
      )
      const blacklist = await getEmailBlacklist(req.scope)
      return res.json({
        blocked: {
          email: customerEmail,
          domain: blockDomain ? customerEmail.split("@")[1] || null : null,
          customer: customerAdminView({ ...customer, metadata: { ...(customer.metadata || {}), disabled: true } }),
        },
        emails: blacklist.emails,
        domains: blacklist.domains,
      })
    }

    // 2) Manuel ekleme
    if (email) {
      await addEmailToBlacklist(req.scope, email)
    } else if (domain) {
      await addDomainToBlacklist(req.scope, domain)
    } else {
      return res.status(400).json({
        code: "invalid_payload",
        message: "email, domain veya customerId gerekli",
      })
    }

    const blacklist = await getEmailBlacklist(req.scope)
    res.json({ emails: blacklist.emails, domains: blacklist.domains })
  } catch (error: any) {
    res.status(500).json({ message: "Kara liste güncellenemedi", error: error?.message })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve("logger") as any
  try {
    const email = typeof req.query.email === "string" ? req.query.email.trim() : ""
    const domain = typeof req.query.domain === "string" ? req.query.domain.trim() : ""

    if (email) {
      await removeEmailFromBlacklist(req.scope, email)
      logger.info(`[admin] kara listeden cikarildi (e-posta): ${email}`)
    } else if (domain) {
      await removeDomainFromBlacklist(req.scope, domain)
      logger.info(`[admin] kara listeden cikarildi (alan adi): ${domain}`)
    } else {
      return res.status(400).json({
        code: "invalid_payload",
        message: "email veya domain sorgu parametresi gerekli",
      })
    }

    const blacklist = await getEmailBlacklist(req.scope)
    res.json({ emails: blacklist.emails, domains: blacklist.domains })
  } catch (error: any) {
    res.status(500).json({ message: "Kara liste güncellenemedi", error: error?.message })
  }
}
