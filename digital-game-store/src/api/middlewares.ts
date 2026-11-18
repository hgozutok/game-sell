import { defineMiddlewares } from "@medusajs/medusa"
import { authenticate } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ACCOUNT_DISABLED_CODE,
  ACCOUNT_DISABLED_MESSAGE,
  isCustomerDisabled,
} from "../utils/customer-status"

// Custom /store route'larinda req.auth'u doldurur (JWT/session/bearer).
// allowUnauthenticated: true — token yoksa istek gecer, actor_id bos olur;
// route'lar kendi icinde 401 doner (fail-closed).
//
// Asagidaki requireActiveCustomer, yonetici tarafindan pasiflestirilmis
// hesaplarin MEVCUT oturumlarini da keser: siparis olusturma, siparis/anahtar
// goruntuleme ve hesap uclari 403 doner.
async function requireActiveCustomer(req: MedusaRequest, res: MedusaResponse, next: any) {
  try {
    const customerId =
      (req as any).auth_context?.actor_id ??
      (req as any).auth?.actor_id ??
      (req as any).auth_context?.actorId ??
      null

    if (!customerId) return next()

    const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
    const customer = await customerModule.retrieveCustomer(customerId).catch(() => null)

    if (customer && isCustomerDisabled(customer.metadata)) {
      return res.status(403).json({
        code: ACCOUNT_DISABLED_CODE,
        message: ACCOUNT_DISABLED_MESSAGE,
      })
    }

    return next()
  } catch {
    // Kontrol yapilamazsa istegi engellemeyiz; route kendi yetki kontrolunu yapar.
    return next()
  }
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/**",
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: /^\/store\/customers\/me(\/.*)?$/,
      middlewares: [requireActiveCustomer],
    },
    {
      matcher: /^\/store\/orders(\/.*)?$/,
      middlewares: [requireActiveCustomer],
    },
    {
      matcher: /^\/store\/auth\/change-password$/,
      middlewares: [requireActiveCustomer],
    },
  ],
})
