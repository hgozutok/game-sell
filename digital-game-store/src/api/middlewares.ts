import { defineMiddlewares } from "@medusajs/medusa"
import { authenticate } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ACCOUNT_DISABLED_CODE,
  ACCOUNT_DISABLED_MESSAGE,
  isCustomerDisabled,
} from "../utils/customer-status"
import {
  checkOrderRateLimit,
  guardCartForCompletion,
  isAllowedPaymentProvider,
  releaseCompletionLock,
} from "../utils/order-guard"
import { clientIp } from "../utils/bot-protection"
import {
  evaluateAutoBlock,
  isIpBlocked,
  normalizeIp,
  recordSuspiciousHit,
} from "../utils/ip-blocklist"

async function adminCorsMiddleware(req: MedusaRequest, res: MedusaResponse, next: any) {
  const origin = req.headers?.origin as string | undefined
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-publishable-api-key, Accept-Language, x-medusa-access-token"
    )
  }
  if (req.method === "OPTIONS") {
    return res.status(204).end()
  }
  return next()
}

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

// Standart Store API uzerinden odeme oturumu acilisini kapatir.
// pp_system_default (Medusa'nin otomatik onaylayan gelistirme saglayicisi)
// ile oturum acmak botlarin parasiz siparis vermesinin ana yoluydu.
// Storefront odeme oturumlarini yalnizca /store/orders/create uzerinden
// (sunucu tarafi fiyat hesabiyla) actigi icin burada tum standart istemler
// reddedilir; saglayici isterse liste disidir. Ileride standart akisa
// gecilirse ALLOW_STORE_PAYMENT_SESSIONS=true ile acilabilir — o durumda
// da izin listesi (pp_system_default reddi) uygulanir.
async function paymentSessionGuard(req: MedusaRequest, res: MedusaResponse, next: any) {
  if (req.method !== "POST") return next()

  const limited = checkOrderRateLimit(req, "payment-session", 60)
  if (limited) {
    return res.status(limited.status!).json({ code: limited.code, message: limited.message })
  }

  const providerId = (req.body as any)?.provider_id
  const allowAll =
    String(process.env.ALLOW_STORE_PAYMENT_SESSIONS || "").toLowerCase() === "true"

  if (!allowAll) {
    const logger = req.scope.resolve("logger") as any
    logger.warn(
      `[payment-session-guard] standart API oturum acilisi reddedildi: ${String(providerId)}`
    )
    return res.status(403).json({
      code: "payment_session_blocked",
      message: "Ödeme oturumu bu uç nokta üzerinden açılamaz",
    })
  }

  if (providerId !== undefined && !isAllowedPaymentProvider(providerId)) {
    const logger = req.scope.resolve("logger") as any
    logger.warn(
      `[payment-session-guard] izinsiz saglayici reddedildi: ${String(providerId)}`
    )
    return res.status(403).json({
      code: "payment_provider_not_allowed",
      message: "Geçersiz ödeme sağlayıcısı",
    })
  }

  return next()
}

// Standart /store/carts/:id/complete cagrisini tamamlayici guard'a baglar:
// fiyat dogrulama, yetkilendirilmis odeme ve tekrar (replay) korumasi.
// Storefront kendi /store/orders/* rotalarini kullandigi icin buradaki siki
// kurallar meşru akisi etkilemez.
async function cartCompleteGuard(req: MedusaRequest, res: MedusaResponse, next: any) {
  if (req.method !== "POST") return next()

  const limited = checkOrderRateLimit(req, "cart-complete", 40)
  if (limited) {
    return res.status(limited.status!).json({ code: limited.code, message: limited.message })
  }

  const match = String(req.path || "").match(/^\/store\/carts\/([^/]+)\/complete/)
  const cartId = match?.[1]
  if (!cartId) return next()

  const guard = await guardCartForCompletion(req.scope, cartId, {
    requireAuthorized: true,
  })
  if (!guard.ok) {
    const logger = req.scope.resolve("logger") as any
    logger.warn(
      `[cart-complete-guard] red: cart=${cartId} code=${guard.code}`
    )
    return res.status(guard.status || 400).json({
      code: guard.code,
      message: guard.message,
    })
  }

  // Kilit workflow bitince birakilir (tamamlanmis sepet kilitli kalmasin).
  res.on("finish", () => releaseCompletionLock(cartId))
  return next()
}

// IP guvenlik kapisi: /store ve /admin'in tamaminda calisir.
// 1) Engel listesindeki IP'ler aninda 403 alir (manuel + otomatik bloklar).
// 2) Yanit 404/403/429 ile biterse IP'nin supheli istek sayaci artar;
//    esik asilirsa IP otomatik engellenir (security.autoblock.* ayarlari,
//    admin panelindeki Guvenlik sayfasindan yonetilir).
// Ozel/iceri ag IP'leri (docker, localhost) ve beyaz liste hicbloklanmaz.
async function ipGuard(req: MedusaRequest, res: MedusaResponse, next: any) {
  let scope: any = null
  try {
    scope = (req as any).scope
    const ip = normalizeIp(clientIp(req))

    if (ip) {
      const check = await isIpBlocked(scope, ip)
      if (check.blocked) {
        const logger = scope.resolve("logger") as any
        logger.warn(
          `[ip-guard] engelli IP istegi: ${ip} -> ${req.method} ${req.path} (blok: ${check.entry?.source}, sebep: ${check.entry?.reason})`
        )
        return res.status(403).json({
          code: "ip_blocked",
          message: "Erişiminiz engellenmiştir",
        })
      }

      // Yanit bittiginde supheli durum degerlendir (404/403/429).
      res.on("finish", () => {
        try {
          const status = res.statusCode
          if (status !== 404 && status !== 403 && status !== 429) return
          // Yalnizca bot taramasi desenleri sayilir — admin/yönetim istekleri
          // beyaz listeye alinmadiysa da esik (varsayilan 20) legit kullanicida
          // asilmaz.
          const windowMs = 10 * 60 * 1000
          const count = recordSuspiciousHit(ip, windowMs)
          if (count === 1) return // ilk istek — degerlendirme gereksiz
          void evaluateAutoBlock(scope, ip, count).then((result) => {
            if (result.blockedNow) {
              const logger2 = scope.resolve("logger") as any
              logger2.warn(
                `[ip-guard] OTOMATIK BLOK: ${ip} — ${result.count} supheli istek (404/403/429)`
              )
            }
          })
        } catch {
          /* arka plan sayaci — hata istegi etkilemesin */
        }
      })
    }
  } catch {
    /* guvenlik kapisi hata verirse istegi engelleme */
  }

  return next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/**",
      middlewares: [adminCorsMiddleware, ipGuard],
    },
    {
      matcher: "/store/**",
      middlewares: [
        ipGuard,
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      matcher: /^\/store\/payment-collections\/[^/]+\/payment-sessions$/,
      middlewares: [paymentSessionGuard],
    },
    {
      matcher: /^\/store\/carts\/[^/]+\/complete$/,
      middlewares: [cartCompleteGuard],
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
