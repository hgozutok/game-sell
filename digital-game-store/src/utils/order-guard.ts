// Siparis olusum guvenlik korumasi.
//
// Bot saldirisina karsi uc katman:
//   1) Odeme saglayici izin listesi — pp_system_default (Medusa'nin gelistirme
//      amacli, her istegi otomatik onaylayan saglayicisi) ve liste disi
//      saglayicilar Store API'den tamamen reddedilir.
//   2) Fiyat dogrulama — sepet satirlarinin birim fiyati tamamlayici anda
//      katalogdan yeniden cozumlenir; istemciden/kirilmis sepetten gelen
//      tutar asla guvenilmez. Fiyatsiz (0) varyant ve 0 toplamli siparis
//      engellenir.
//   3) Odeme + tekrar korumasi — siparis tamamlanmadan once yetkilendirilmis
//      odeme oturumu (izinli saglayicidan, tutar sepet toplamina esit) aranir;
//      ayni sebetin iki kez tamamlanmasi / ayni odemeden iki siparis cikmasi
//      kilit + completed_at + mevcut siparis sorgusuyla engellenir.
import { Modules } from "@medusajs/framework/utils"
import { resolveVariantUnitPrice } from "./variant-pricing"
import { getCurrencyRates } from "./currency"
import { rateLimit, clientIp } from "./bot-protection"
import { isCustomerDisabled } from "./customer-status"
import { getAuthSettings } from "./auth-session"
import { verifyEmailNotBlacklisted } from "./email-blacklist"

// Izinli odeme saglayici anahtar kelimeleri (kayit id'leri pp_<modul>_<servis>
// biciminde olustugundan eslesme icerirme uzerinden yapilir).
const ALLOWED_PROVIDER_KEYWORDS = [
  "stripe",
  "paypal",
  "mollie",
  "bank-transfer",
  "bank_transfer",
]

export interface GuardResult {
  ok: boolean
  status?: number
  code?: string
  message?: string
}

const fail = (status: number, code: string, message: string): GuardResult => ({
  ok: false,
  status,
  code,
  message,
})

/** pp_system_default ve benzeri sistem/gelistirme saglayicilari asla kabul edilmez. */
export function isAllowedPaymentProvider(providerId: unknown): boolean {
  const pid = String(providerId || "").toLowerCase()
  if (!pid) return false
  // 'system' gecen her saglayici (pp_system_default dahil) test/simulasyon saglayicisidir
  if (pid.includes("system")) return false
  return ALLOWED_PROVIDER_KEYWORDS.some((k) => pid.includes(k))
}

// ---- Tekrar (replay) kilidi — ayni sepet eszamanli/arka arkaya tamamlanamaz ----
// Surec ici kilit (tek instance icin yeterli); completed_at + siparis sorgusu
// degisken durumlari (restart, coklu istek) kapatir.
const completionLocks = new Map<string, number>()

export function acquireCompletionLock(cartId: string, ttlMs = 60_000): boolean {
  const now = Date.now()
  const expiresAt = completionLocks.get(cartId) || 0
  if (expiresAt > now) return false
  completionLocks.set(cartId, now + ttlMs)
  if (completionLocks.size > 10_000) {
    for (const [key, exp] of completionLocks) {
      if (exp <= now) completionLocks.delete(key)
    }
  }
  return true
}

export function releaseCompletionLock(cartId: string): void {
  completionLocks.delete(cartId)
}

/**
 * Satir bazli fiyat dogrulamasi: her varyantin birim fiyati sunucu tarafinda
 * katalogdan yeniden cozumlenir ve sepetteki ile karsilastirilir.
 * - Fiyatsiz varyant (0 cozumlenen) -> red (0.00 USD'lik sahte siparis vektoru)
 * - Fiyat farki (>1 minor) -> red (fiyat manipulasyonu)
 * - varyantsiz ozel satir yalnizca odeme komisyonu olarak isaretliyse gecerli
 */
export async function verifyCartPricing(scope: any, cart: any): Promise<GuardResult> {
  const items: any[] = cart?.items || []
  if (items.length === 0) {
    return fail(400, "cart_empty", "Sepet boş — sipariş oluşturulamaz")
  }

  const storeSettings = scope.resolve("storeSettings") as any
  const rates: Record<string, number> = await getCurrencyRates(storeSettings).catch(
    () => ({}) as Record<string, number>
  )
  const currency = String(cart.currency_code || "usd").toLowerCase()

  let serverTotal = 0
  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity || 1))
    const unitPrice = Number(item.unit_price || 0)

    if (item.variant_id) {
      const resolved = await resolveVariantUnitPrice(scope, item.variant_id, currency, rates)
      if (!(resolved.unitPriceMinor > 0)) {
        return fail(
          400,
          "unpriced_variant",
          `Ürün için katalog fiyatı yok — sipariş oluşturulamaz (${item.title || item.variant_id})`
        )
      }
      if (Math.abs(unitPrice - resolved.unitPriceMinor) > 1) {
        // Fiyat sepete sonradan mudahale edilmis — asla gecme.
        return fail(
          400,
          "price_mismatch",
          `Ürün fiyatı katalogla uyuşmuyor — sipariş oluşturulamaz (${item.title || item.variant_id})`
        )
      }
    } else {
      // Varyantsiz satir (odeme komisyonu) — sadece sunucunun ekledigi isaretle
      const isPaymentFee =
        item?.metadata?.is_payment_fee === true || item.title === "Payment processing fee"
      if (!isPaymentFee) {
        return fail(400, "invalid_custom_item", "Sepette geçersiz özel kalem var")
      }
    }

    serverTotal += unitPrice * qty
  }

  if (!(serverTotal > 0)) {
    return fail(400, "cart_total_zero", "Sepet toplamı sıfır — sipariş oluşturulamaz")
  }

  // Sepet toplami satir toplamindan kucuk olamaz (vergi/kargo yalnizca ekler).
  const cartTotal = Number(cart.total || 0)
  if (cartTotal > 0 && cartTotal < serverTotal - 1) {
    return fail(400, "total_mismatch", "Sepet toplamı doğrulanamadı")
  }

  return { ok: true }
}

/**
 * Odeme dogrulamasi: sepete bagli odeme koleksiyonunda
 *  - izinli saglayicidan (pp_system_default reddi) VE
 *  - tutari sepet toplamina esit aktif bir oturum aranir.
 *  - requireAuthorized=true ise oturum ayrica yetkilendirilmis olmalidir.
 *    (stripe/paypal/bank-transfer akislarinda yetkilendirme completeCartWorkflow
 *    icinde gercek PSP cagrisiyla yapildigindan custom rotalarda false kullanilir.)
 */
export async function verifyCartPayment(
  scope: any,
  cart: any,
  opts: { requireAuthorized: boolean }
): Promise<GuardResult> {
  const paymentModule = scope.resolve(Modules.PAYMENT) as any
  const cartId = cart?.id

  const collections = await paymentModule
    .listPaymentCollections({ cart_id: cartId })
    .catch(() => [])
  const collection = (collections || [])[0]
  if (!collection) {
    return fail(400, "payment_missing", "Ödeme bulunamadı — sipariş oluşturulamaz")
  }

  let sessions: any[] = collection.payment_sessions
  if (!Array.isArray(sessions)) {
    sessions = await paymentModule
      .listPaymentSessions({ payment_collection_id: collection.id })
      .catch(() => [])
  }
  if (!sessions || sessions.length === 0) {
    return fail(400, "payment_missing", "Ödeme oturumu yok — sipariş oluşturulamaz")
  }

  // Koleksiyonda sistem saglayicisi oturumu varsa hepten suphecidir.
  const systemSession = sessions.find((s) =>
    String(s.provider_id || "").toLowerCase().includes("system")
  )
  if (systemSession) {
    return fail(
      403,
      "payment_provider_not_allowed",
      `Geçersiz ödeme sağlayıcısı (${systemSession.provider_id})`
    )
  }

  // Aktif oturumlar: pending / requires_more / authorized (iptal edilenler degil)
  const activeStatuses = ["pending", "requires_more", "authorized"]
  const activeSessions = sessions.filter((s) => activeStatuses.includes(String(s.status)))
  const allowedSessions = activeSessions.filter((s) =>
    isAllowedPaymentProvider(s.provider_id)
  )
  if (allowedSessions.length === 0) {
    return fail(403, "payment_provider_not_allowed", "Geçersiz ödeme sağlayıcısı")
  }

  // Tahsilat tutari sepet toplamiyla eslesmeli — oturum acildiktan sonra sepetin
  // sisirilmesi (yeni urun ekleme) bu kontrolde yakalanir. Modul total
  // hesaplamamisssa satir toplamindan duseriz.
  const linesTotal = (cart.items || []).reduce(
    (sum: number, item: any) =>
      sum + Number(item.unit_price || 0) * Math.max(1, Number(item.quantity || 1)),
    0
  )
  const expectedTotal =
    Number(cart.total) > 0 ? Number(cart.total) : Math.max(linesTotal, Number(cart.subtotal || 0))
  const matching = allowedSessions.find(
    (s) => Math.abs(Number(s.amount || 0) - expectedTotal) <= 1
  )
  if (!matching) {
    return fail(400, "payment_amount_mismatch", "Ödeme tutarı sepet toplamıyla uyuşmuyor")
  }

  if (opts.requireAuthorized) {
    const authorized = allowedSessions.filter((s) => String(s.status) === "authorized")
    if (authorized.length === 0) {
      return fail(402, "payment_not_authorized", "Ödeme onayı tamamlanmadı")
    }
  }

  return { ok: true }
}

/**
 * Tam kombin guard: tekrar korumasi + fiyat dogrulamasi + odeme dogrulamasi.
 * Basari durumunda tamamlama kilidi alinir — cagiran taraf islem bitince
 * releaseCompletionLock(cartId) ile birakmakla yukumludur.
 *
 * opts.requireAuthorized:
 *   true  -> odeme zaten yetkilendirilmis olmali (standart complete, stripe, paypal)
 *   false -> yetkilendirme completeCartWorkflow icinde yapilacak (bank-transfer);
 *            saglayici izin listesi yine de uygulanir.
 */
export async function guardCartForCompletion(
  scope: any,
  cartId: string,
  opts: { requireAuthorized: boolean }
): Promise<GuardResult> {
  const cartModule = scope.resolve(Modules.CART) as any
  const cart = await cartModule
    .retrieveCart(cartId, { relations: ["items"] })
    .catch(() => null)
  if (!cart) {
    return fail(404, "cart_not_found", "Sepet bulunamadı")
  }

  // Tekrar korumasi 1: sepet zaten tamamlanmis
  if (cart.completed_at) {
    return fail(409, "cart_already_completed", "Bu sepet zaten tamamlandı")
  }

  // Tekrar korumasi 2: bu septen zaten siparis cikmis
  const orderModule = scope.resolve(Modules.ORDER) as any
  const existingOrders = await orderModule.listOrders({ cart_id: cart.id }).catch(() => [])
  if (Array.isArray(existingOrders) && existingOrders.length > 0) {
    return fail(409, "order_already_exists", "Bu sepet için sipariş zaten oluşturuldu")
  }

  // Tekrar korumasi 3: eszamanli tamamlama yarisi (race)
  if (!acquireCompletionLock(cart.id)) {
    return fail(409, "completion_in_progress", "Sipariş tamamlama işlemi sürüyor")
  }

  const pricing = await verifyCartPricing(scope, cart)
  if (!pricing.ok) {
    releaseCompletionLock(cart.id)
    return pricing
  }

  const payment = await verifyCartPayment(scope, cart, opts)
  if (!payment.ok) {
    releaseCompletionLock(cart.id)
    return payment
  }

  // Musteri dogrulamasi (orders.require_verified_customer acikken):
  // sepet giris yapmis + e-postasi dogrulanmis musteriye bagli olmali.
  const customerCheck = await verifyCartCustomer(scope, cart)
  if (!customerCheck.ok) {
    releaseCompletionLock(cart.id)
    return customerCheck
  }

  // E-posta kara listesi: sepet e-postasi (tam adres veya alan adi) engelliyse
  // siparis tamamlanamaz.
  const blacklistCheck = await verifyEmailNotBlacklisted(scope, cart.email)
  if (!blacklistCheck.ok) {
    releaseCompletionLock(cart.id)
    return blacklistCheck
  }

  return { ok: true }
}

/** Siparis uc noktalari icin IP bazli hafif hiz siniri (bot flood korumasi). */
export function checkOrderRateLimit(
  req: any,
  bucket: string,
  limit = 30,
  windowMs = 10 * 60_000
): GuardResult | null {
  const ip = clientIp(req)
  const { allowed, retryAfterSec } = rateLimit(`${bucket}:${ip}`, limit, windowMs)
  if (!allowed) {
    return fail(
      429,
      "rate_limited",
      `Çok fazla istek — lütfen ${retryAfterSec} saniye sonra tekrar deneyin`
    )
  }
  return null
}

// ---- Onaylanmamis kullanici siparisleri ----
// Ayar: orders.require_verified_customer (default TRUE) — siparis verebilmek
// icin giris yapilmis VE e-postasi dogrulanmis musteri hesabi gerekir.
// Misafir siparis ve dogrulanmamis hesap siparisi reddedilir. Admin ayari
// false yapilirsa eski misafir siparis davranisi geri gelir.

export async function getRequireVerifiedCustomer(scope: any): Promise<boolean> {
  try {
    const storeSettings = scope.resolve("storeSettings") as any
    const value = await storeSettings.getSettingValue(
      "orders.require_verified_customer",
      true
    )
    return value !== false && value !== "false"
  } catch {
    // ayar okunamazsa guvenli taraf: zorunlu
    return true
  }
}

function checkCustomerVerified(customer: any): GuardResult & { customer?: any } {
  if (!customer) {
    return { ok: false, status: 401, code: "login_required", message: "Sipariş vermek için giriş yapmalısınız" }
  }
  if (isCustomerDisabled(customer.metadata)) {
    return { ok: false, status: 403, code: "account_disabled", message: "Hesabınız devre dışı" }
  }
  if (customer.metadata?.email_verified !== true) {
    return {
      ok: false,
      status: 403,
      code: "email_not_verified",
      message: "Sipariş vermeden önce e-posta adresinizi doğrulamalısınız",
    }
  }
  return { ok: true, customer }
}

/**
 * Musteri kapisi degerlendirmesi. E-posta dogrulama bayragi yalnizca auth
 * tarafinda dogrulama acikken (SMTP yapilandirilmis) sarttir — dogrulama
 * politika geregi kapaliysa (SMTP yok) sadece giris yeterli; kullaniciyi
 * dogrulayamiyan bir sistemde herkesi siparisten kilitlememek icin.
 */
async function evaluateCustomerGate(
  scope: any,
  customer: any
): Promise<GuardResult & { customer?: any }> {
  const staticCheck = checkCustomerVerified(customer)
  // Yalnizca "dogrulanmamis e-posta" durumu politika kontrolune konur;
  // diger sonuclar (girissiz, kapali hesap, dogrulanmis) oldugu gibi doner.
  if (staticCheck.code !== "email_not_verified") {
    return staticCheck
  }
  // Bayrak yok — auth tarafinda dogrulama zorunlu mu bak
  const authSettings = await Promise.resolve(
    (getAuthSettings as any)(scope)
  ).catch(() => null)
  if (authSettings && authSettings.verificationRequired === false) {
    return { ok: true, customer }
  }
  return staticCheck
}

/**
 * Siparis olusturma uc noktalari icin musteri kapisi.
 * Ayar acikken (varsayilan): giris yapilmis + dogrulanmis hesap zorunlu.
 * Ayar kapaliyken girisli kullanici yine cozumlenir (eposta baglama icin),
 * fakat misafir/dogrulanmamis siparise izin verilir.
 *
 * Donus: ok + customer (girisliyse), veya hata kodu.
 */
export async function requireVerifiedCustomerForOrder(
  req: any
): Promise<GuardResult & { customer?: any }> {
  const scope = req.scope
  const requireVerified = await getRequireVerifiedCustomer(scope)
  if (!requireVerified) {
    // Girisli kullanici varsa getir; yokken de siparise izin ver.
    const customerId =
      (req as any).auth_context?.actor_id ?? (req as any).auth?.actor_id ?? null
    if (!customerId) return { ok: true }
    const customerModule = scope.resolve(Modules.CUSTOMER) as any
    const customer = await customerModule.retrieveCustomer(customerId).catch(() => null)
    return { ok: true, customer: customer || undefined }
  }

  const customerId =
    (req as any).auth_context?.actor_id ??
    (req as any).auth?.actor_id ??
    (req as any).auth_context?.actorId ??
    null
  const customerModule = customerId
    ? (scope.resolve(Modules.CUSTOMER) as any)
    : null
  const customer = customerId && customerModule
    ? await customerModule.retrieveCustomer(customerId).catch(() => null)
    : null

  return evaluateCustomerGate(scope, customer)
}

/**
 * Sepet tamamlama guard'i icin musteri dogrulamasi: sepet bir dogrulanmis
 * musteriye bagli olmali (orders/create dogrulanmis hesabi baglar).
 */
export async function verifyCartCustomer(scope: any, cart: any): Promise<GuardResult> {
  const requireVerified = await getRequireVerifiedCustomer(scope)
  if (!requireVerified) return { ok: true }

  const customerId = cart?.customer_id
  const customerModule = scope.resolve(Modules.CUSTOMER) as any
  const customer = customerId
    ? await customerModule.retrieveCustomer(customerId).catch(() => null)
    : null

  const result = await evaluateCustomerGate(scope, customer)
  if (!result.ok && result.code === "login_required") {
    return {
      ok: false,
      status: 401,
      code: "login_required",
      message: "Sipariş vermek için giriş yapmalısınız",
    }
  }
  return result
}
