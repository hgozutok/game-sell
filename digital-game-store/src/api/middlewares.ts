import { defineMiddlewares } from "@medusajs/medusa"
import { authenticate } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ACCOUNT_DISABLED_CODE,
  ACCOUNT_DISABLED_MESSAGE,
  isCustomerDisabled,
} from "../utils/customer-status"
import { clientIp } from "../utils/bot-protection"
import {
  checkOrderRateLimit,
  guardCartForCompletion,
  releaseCompletionLock,
} from "../utils/order-guard"
import {
  evaluateAutoBlock,
  isIpBlocked,
  normalizeIp,
  recordSuspiciousHit,
} from "../utils/ip-blocklist"

// DIKKAT: defineMiddlewares'in `matcher` alaninda RegExp KULLANILMAZ.
// MiddlewareFileLoader matcher'i String()'e cevirir ve Express'e literal path
// olarak kaydeder — regex matcher'lar hicbir istekle eslesmez (sessizce
// devre disi kalir). Bu yuzden tum guard'lar STRING PREFIX matcher ile
// (app.use("/store", mw) davranisi) ve icinde manuel path kontroluyle calisir.

// DEPLOY DOGRULAMA ISARETI: sunucu logunda bu satiri gordugunuzde bu dosya
// canlidir.  `docker compose logs backend | grep security-middleware-v4`
console.log(
  "[security-middleware-v4] yuklendi — case-insensitive storeGuard + XFF son-giris clientIp"
)

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

// ---- IP guvenlik + siparis kapilari (/store ve /admin prefix'lerine takilir) ----

function fullUrl(req: MedusaRequest): string {
  // app.use("/store") icinde req.path mount edilmis kisaltilmis yoldur;
  // tam yolu originalUrl'den aliriz.
  return String((req as any).originalUrl || req.url || "")
}

/** Engelli IP kontrolu + supheli istek sayaci (otomatik blok motoru). */
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
          `[ip-guard] engelli IP istegi: ${ip} -> ${req.method} ${fullUrl(req)} (blok: ${check.entry?.source})`
        )
        return res.status(403).json({
          code: "ip_blocked",
          message: "Erişiminiz engellenmiştir",
        })
      }

      // Yanit bittiginde supheli durum degerlendir (404/403/429 — bot tarama deseni).
      res.on("finish", () => {
        try {
          const status = res.statusCode
          if (status !== 404 && status !== 403 && status !== 429) return
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

/**
 * Standart Store API odeme oturumu acilisini kapatir.
 * pp_system_default (Medusa'nin otomatik onaylayan gelistirme saglayicisi)
 * ile oturum acmak botlarin parasiz siparis vermesinin ana yoluydu.
 * Storefront odeme oturumlarini yalnizca /store/orders/create uzerinden
 * (sunucu tarafi fiyat hesabiyla) actigi icin burada tum standart istemler
 * reddedilir. Ileride standart akisa gecilirse ALLOW_STORE_PAYMENT_SESSIONS=true
 * ile acilabilir — o durumda da izin listesi (pp_system_default reddi) uygulanir.
 */
async function blockStorePaymentCollections(
  req: MedusaRequest,
  res: MedusaResponse,
  next: any
) {
  if (req.method !== "POST") return next()

  const limited = checkOrderRateLimit(req, "payment-session", 60)
  if (limited) {
    return res.status(limited.status!).json({ code: limited.code, message: limited.message })
  }

  const allowAll =
    String(process.env.ALLOW_STORE_PAYMENT_SESSIONS || "").toLowerCase() === "true"

  if (!allowAll) {
    const logger = req.scope.resolve("logger") as any
    logger.warn(
      `[payment-session-guard] standart API odeme koleksiyonu/oturumu reddedildi: ${req.method} ${fullUrl(req)}`
    )
    return res.status(403).json({
      code: "payment_session_blocked",
      message: "Ödeme bu uç nokta üzerinden açılamaz",
    })
  }

  // allowAll modunda da izin listesi uygulanir (pp_system_default asla yok)
  const providerId = (req.body as any)?.provider_id
  if (
    providerId !== undefined &&
    String(providerId).toLowerCase().includes("system")
  ) {
    const logger = req.scope.resolve("logger") as any
    logger.warn(`[payment-session-guard] izinsiz saglayici reddedildi: ${String(providerId)}`)
    return res.status(403).json({
      code: "payment_provider_not_allowed",
      message: "Geçersiz ödeme sağlayıcısı",
    })
  }

  return next()
}

/**
 * Standart /store/carts/:id/complete cagrisini tamamlayici guard'a baglar:
 * fiyat dogrulama, odeme saglayici/tutar kontrolu, musteri kapisi,
 * e-posta kara listesi ve tekrar (replay) korumasi.
 * Storefront kendi /store/orders/* rotalarini kullandigi icin buradaki siki
 * kurallar meşru akisi etkilemez.
 */
async function cartCompleteGuard(req: MedusaRequest, res: MedusaResponse, next: any) {
  if (req.method !== "POST") return next()

  const limited = checkOrderRateLimit(req, "cart-complete", 40)
  if (limited) {
    return res.status(limited.status!).json({ code: limited.code, message: limited.message })
  }

  // /i: Express harf duyarsiz yonlendirir ("/store/Carts" da handler'a ulasir)
  const match = fullUrl(req).match(/^\/store\/carts\/([^/]+)\/complete\/?$/i)
  const cartId = match?.[1]
  if (!cartId) return next()

  // IP izini sepete yaz — completeCartWorkflow cart.metadata'yi siparise
  // tasidigi icin IP, order.metadata.complete_ip olarak kayda gecer.
  // Guard'dan ONCE yazilir: reddedilen denemelerde de iz kalir.
  try {
    const ip = clientIp(req)
    if (ip && ip !== "unknown") {
      const cartModule = (req as any).scope.resolve(Modules.CART) as any
      const existing = await cartModule
        .retrieveCart(cartId, {})
        .catch(() => null)
      if (existing) {
        await cartModule
          .updateCarts(existing.id, {
            metadata: {
              ...(existing.metadata || {}),
              complete_ip: ip,
              complete_ip_at: new Date().toISOString(),
            },
          })
          .catch(() => null)
      }
    }
  } catch {
    /* iz yazilamadi — akisi bloklama */
  }

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

/**
 /store prefix'ine takilan tek guvenlik middleware'i: engelli IP, supheli
 istek sayaci, standart API odeme/complete kapilari. Express prefix matching
 (app.use("/store", mw)) path-to-regexp'e bagli degildir — her zaman calisir.
 *
 * Express route eslestirmesi BUYUK/KUCUK HARF DUYARSIZDIR (caseSensitive:false)
 * — "/store/Carts/cart_x/complete" handler'a ulasir. Bu yuzden path kontrolleri
 * kucuk harfe normalize edilerek YAPILMALI; aksi halde kasinan harf duyarli
 * kontrolu bypass eder (bot tam olarak bunu denedi).
 */
async function storeGuard(req: MedusaRequest, res: MedusaResponse, next: any) {
  const rawUrl = fullUrl(req)
  const url = rawUrl.toLowerCase()

  // 1) Standart API odeme koleksiyonu/oturumu acma — TAMAMEN kapali
  //    (prefix: /store/payment-collections, her kasa kombinasyonu)
  if (req.method === "POST" && url.startsWith("/store/payment-collections")) {
    return blockStorePaymentCollections(req, res, next)
  }

  // 2) Standart sepet tamamlama — guard'li
  //    /i: harf duyarsiz; /?$: trailing slash bypass'ini da kapatir
  if (req.method === "POST" && /^\/store\/carts\/([^/]+)\/complete\/?$/i.test(rawUrl)) {
    return cartCompleteGuard(req, res, next)
  }

  return next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin",
      middlewares: [adminCorsMiddleware, ipGuard],
    },
    {
      matcher: "/store",
      middlewares: [
        ipGuard,
        storeGuard,
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    {
      // prefix: /store/customers/me ve alt yollari (orders, digital-keys...)
      matcher: "/store/customers/me",
      middlewares: [requireActiveCustomer],
    },
    {
      // prefix: /store/orders ve alt yollari
      matcher: "/store/orders",
      middlewares: [requireActiveCustomer],
    },
    {
      matcher: "/store/auth/change-password",
      middlewares: [requireActiveCustomer],
    },
  ],
})
