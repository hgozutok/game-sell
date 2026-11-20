/**
 * order-guard birim testleri: saglayici izin listesi (pp_system_default reddi),
 * sepet fiyat dogrulamasi, odeme/tutar kontrolu ve tekrar (replay) kilidi.
 */
import {
  acquireCompletionLock,
  checkOrderRateLimit,
  guardCartForCompletion,
  isAllowedPaymentProvider,
  releaseCompletionLock,
  requireVerifiedCustomerForOrder,
  verifyCartCustomer,
  verifyCartPayment,
  verifyCartPricing,
} from "../order-guard"
import { resolveVariantUnitPrice } from "../variant-pricing"
import { getAuthSettings } from "../auth-session"

jest.mock("../variant-pricing", () => ({
  resolveVariantUnitPrice: jest.fn(),
}))
jest.mock("../currency", () => ({
  getCurrencyRates: jest.fn(async () => ({})),
}))
jest.mock("../bot-protection", () => ({
  rateLimit: jest.fn(() => ({ allowed: true, retryAfterSec: 0 })),
  clientIp: jest.fn(() => "1.2.3.4"),
}))
// Auth tarafinda e-posta dogrulama politikasi acik (SMTP var) varsayilir;
// "politika kapali" durumu ilgili testte ayarlanir.
jest.mock("../auth-session", () => ({
  getAuthSettings: jest.fn(async () => ({ verificationRequired: true })),
}))

const resolveVariant = resolveVariantUnitPrice as jest.Mock

const variantItem = (over: Record<string, any> = {}) => ({
  variant_id: "variant_1",
  title: "Test Game",
  quantity: 1,
  unit_price: 1999,
  ...over,
})

const feeItem = (over: Record<string, any> = {}) => ({
  title: "Payment processing fee",
  quantity: 1,
  unit_price: 90,
  metadata: { is_payment_fee: true },
  ...over,
})

const verifiedCustomer = {
  id: "cus_1",
  email: "buyer@example.com",
  metadata: { email_verified: true },
}

const customerModule = (customer: any) => ({
  retrieveCustomer: async () => customer,
})

function makeCart(over: Record<string, any> = {}) {
  return {
    id: "cart_1",
    currency_code: "usd",
    total: 2089,
    subtotal: 2089,
    items: [variantItem(), feeItem()],
    completed_at: null,
    customer_id: "cus_1",
    ...over,
  }
}

/** scope.resolve icin modul servis mock'lari. */
function makeScope(over: Record<string, any> = {}) {
  return {
    resolve: (name: string) => {
      if (over[name]) return over[name]
      throw new Error(`unexpected resolve: ${name}`)
    },
  }
}

const settingsModule = (map: Record<string, any> = {}) => ({
  getSettingValue: async (key: string, def: any = null) =>
    Object.prototype.hasOwnProperty.call(map, key) ? map[key] : def,
})

const CART = "cart"
const PAYMENT = "payment"
const ORDER = "order"
const CUSTOMER = "customer"

// modul adlari sabit degere eslenmeli (framework'ten gelirse test patlamasin)
function withModules(map: Record<string, any>) {
  const byName: Record<string, any> = {}
  if (map.cart) byName[CART] = map.cart
  if (map.payment) byName[PAYMENT] = map.payment
  if (map.order) byName[ORDER] = map.order
  if (map.customer) byName[CUSTOMER] = map.customer
  byName.storeSettings = map.storeSettings || settingsModule()
  return makeScope(byName)
}

describe("isAllowedPaymentProvider", () => {
  it("pp_system_default ve benzeri sistem saglayicilari reddeder", () => {
    expect(isAllowedPaymentProvider("pp_system_default")).toBe(false)
    expect(isAllowedPaymentProvider("system_default")).toBe(false)
    expect(isAllowedPaymentProvider("PP_SYSTEM_DEFAULT")).toBe(false)
    expect(isAllowedPaymentProvider(undefined)).toBe(false)
    expect(isAllowedPaymentProvider("")).toBe(false)
  })

  it("gercek saglayicilari kabul eder", () => {
    expect(isAllowedPaymentProvider("pp_stripe_stripe")).toBe(true)
    expect(isAllowedPaymentProvider("pp_paypal_paypal")).toBe(true)
    expect(isAllowedPaymentProvider("pp_bank-transfer_bank-transfer")).toBe(true)
    expect(isAllowedPaymentProvider("pp_mollie_mollie")).toBe(true)
  })
})

describe("completion lock", () => {
  beforeEach(() => {
    releaseCompletionLock("cart_lock")
  })

  it("ayni sepet icin ikinci kilidi reddeder, birakildiginda tekrar acar", () => {
    expect(acquireCompletionLock("cart_lock")).toBe(true)
    expect(acquireCompletionLock("cart_lock")).toBe(false)
    releaseCompletionLock("cart_lock")
    expect(acquireCompletionLock("cart_lock")).toBe(true)
  })

  it("TTL doldugunda kilit kendiliginden duser", () => {
    expect(acquireCompletionLock("cart_lock", 5)).toBe(true)
    return new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
      expect(acquireCompletionLock("cart_lock", 5)).toBe(true)
    })
  })
})

describe("verifyCartPricing", () => {
  const scope = withModules({ storeSettings: {} })

  it("bos sepeti reddeder", async () => {
    const result = await verifyCartPricing(scope, makeCart({ items: [] }))
    expect(result.ok).toBe(false)
    expect(result.code).toBe("cart_empty")
  })

  it("katalog fiyati olmayan varyanti reddeder (0.00 saldiri vektoru)", async () => {
    resolveVariant.mockResolvedValue({ unitPriceMinor: 0 })
    const result = await verifyCartPricing(scope, makeCart())
    expect(result.ok).toBe(false)
    expect(result.code).toBe("unpriced_variant")
  })

  it("katalog fiyatiyla eslesmeyen satir fiyatini reddeder", async () => {
    resolveVariant.mockResolvedValue({ unitPriceMinor: 4999 })
    const result = await verifyCartPricing(scope, makeCart())
    expect(result.ok).toBe(false)
    expect(result.code).toBe("price_mismatch")
  })

  it("isaretsiz varyantsiz ozel kalemi reddeder", async () => {
    resolveVariant.mockResolvedValue({ unitPriceMinor: 1999 })
    const result = await verifyCartPricing(
      scope,
      makeCart({
        items: [variantItem(), { title: "Discount", quantity: 1, unit_price: -500 }],
      })
    )
    expect(result.ok).toBe(false)
    expect(result.code).toBe("invalid_custom_item")
  })

  it("0 toplamli sepeti reddeder", async () => {
    const result = await verifyCartPricing(
      scope,
      makeCart({ items: [feeItem({ unit_price: 0 })] })
    )
    expect(result.ok).toBe(false)
    expect(result.code).toBe("cart_total_zero")
  })

  it("sepet toplami satir toplamindan kucukse reddeder", async () => {
    resolveVariant.mockResolvedValue({ unitPriceMinor: 1999 })
    const result = await verifyCartPricing(scope, makeCart({ total: 100 }))
    expect(result.ok).toBe(false)
    expect(result.code).toBe("total_mismatch")
  })

  it("fiyatlari dogrulanmis sepeti gecirir", async () => {
    resolveVariant.mockResolvedValue({ unitPriceMinor: 1999 })
    const result = await verifyCartPricing(scope, makeCart())
    expect(result.ok).toBe(true)
  })
})

describe("verifyCartPayment", () => {
  const session = (over: Record<string, any> = {}) => ({
    id: "payses_1",
    provider_id: "pp_stripe_stripe",
    status: "pending",
    amount: 2089,
    ...over,
  })

  const paymentScope = (sessions: any[]) =>
    withModules({
      payment: {
        listPaymentCollections: async () => [
          { id: "paycol_1", payment_sessions: sessions },
        ],
      },
    })

  it("odeme koleksiyonu yoksa reddeder", async () => {
    const scope = withModules({
      payment: { listPaymentCollections: async () => [] },
    })
    const result = await verifyCartPayment(scope, makeCart(), { requireAuthorized: false })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("payment_missing")
  })

  it("oturum yoksa reddeder", async () => {
    const scope = paymentScope([])
    const result = await verifyCartPayment(scope, makeCart(), { requireAuthorized: false })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("payment_missing")
  })

  it("koleksiyondaki sistem saglayicisi oturumunu reddeder", async () => {
    const scope = paymentScope([
      session({ id: "payses_sys", provider_id: "pp_system_default", status: "authorized" }),
    ])
    const result = await verifyCartPayment(scope, makeCart(), { requireAuthorized: false })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("payment_provider_not_allowed")
    expect(result.status).toBe(403)
  })

  it("izin listesi disi saglayiciyi reddeder", async () => {
    const scope = paymentScope([session({ provider_id: "pp_weird_unknown" })])
    const result = await verifyCartPayment(scope, makeCart(), { requireAuthorized: false })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("payment_provider_not_allowed")
  })

  it("tutari sepetle eslesmeyen oturumu reddeder (sepet sisirme korumasi)", async () => {
    const scope = paymentScope([session({ amount: 100 })])
    const result = await verifyCartPayment(scope, makeCart(), { requireAuthorized: false })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("payment_amount_mismatch")
  })

  it("requireAuthorized=true iken yetkilendirilmemis oturumu reddeder", async () => {
    const scope = paymentScope([session({ status: "pending" })])
    const result = await verifyCartPayment(scope, makeCart(), { requireAuthorized: true })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("payment_not_authorized")
    expect(result.status).toBe(402)
  })

  it("pending oturumu amount eslesmesiyle gecirir (authorize workflow icinde)", async () => {
    const scope = paymentScope([session({ status: "pending" })])
    const result = await verifyCartPayment(scope, makeCart(), { requireAuthorized: false })
    expect(result.ok).toBe(true)
  })

  it("authorized oturumu requireAuthorized=true ile gecirir", async () => {
    const scope = paymentScope([session({ status: "authorized" })])
    const result = await verifyCartPayment(scope, makeCart(), { requireAuthorized: true })
    expect(result.ok).toBe(true)
  })
})

describe("guardCartForCompletion", () => {
  beforeEach(() => {
    releaseCompletionLock("cart_1")
    resolveVariant.mockReset()
  })

  const happyScope = () =>
    withModules({
      storeSettings: {},
      cart: {
        retrieveCart: async () => makeCart(),
      },
      order: { listOrders: async () => [] },
      customer: customerModule(verifiedCustomer),
      payment: {
        listPaymentCollections: async () => [
          {
            id: "paycol_1",
            payment_sessions: [
              { provider_id: "pp_stripe_stripe", status: "pending", amount: 2089 },
            ],
          },
        ],
      },
    })

  it("sepet bulunamazsa 404 doner", async () => {
    const scope = withModules({
      cart: { retrieveCart: async () => null },
    })
    const result = await guardCartForCompletion(scope, "cart_1", {
      requireAuthorized: false,
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("cart_not_found")
  })

  it("tamamlanmis sepeti reddeder (tekrar korumasi)", async () => {
    const scope = withModules({
      storeSettings: {},
      cart: { retrieveCart: async () => makeCart({ completed_at: new Date() }) },
    })
    const result = await guardCartForCompletion(scope, "cart_1", {
      requireAuthorized: false,
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("cart_already_completed")
    expect(result.status).toBe(409)
  })

  it("septen zaten siparis ciktiysa reddeder", async () => {
    const scope = withModules({
      storeSettings: {},
      cart: { retrieveCart: async () => makeCart() },
      order: { listOrders: async () => [{ id: "order_1" }] },
    })
    const result = await guardCartForCompletion(scope, "cart_1", {
      requireAuthorized: false,
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("order_already_exists")
    expect(result.status).toBe(409)
  })

  it("basarisiz guard sonrasi kilidi birakir", async () => {
    resolveVariant.mockResolvedValue({ unitPriceMinor: 0 })
    const result = await guardCartForCompletion(happyScope(), "cart_1", {
      requireAuthorized: false,
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("unpriced_variant")
    expect(acquireCompletionLock("cart_1")).toBe(true)
    releaseCompletionLock("cart_1")
  })

  it("gecerli sepeti gecirir ve tamamlama kilidini alir", async () => {
    resolveVariant.mockResolvedValue({ unitPriceMinor: 1999 })
    const result = await guardCartForCompletion(happyScope(), "cart_1", {
      requireAuthorized: false,
    })
    expect(result.ok).toBe(true)
    expect(acquireCompletionLock("cart_1")).toBe(false)
    releaseCompletionLock("cart_1")
  })
})

describe("checkOrderRateLimit", () => {
  it("izin penceresi icinde gecirir, asimda 429 doner", () => {
    const { rateLimit } = jest.requireMock("../bot-protection")
    rateLimit.mockImplementationOnce(() => ({ allowed: true, retryAfterSec: 0 }))

    const req = { headers: {} }
    expect(checkOrderRateLimit(req, "test-bucket")).toBeNull()

    rateLimit.mockImplementationOnce(() => ({ allowed: false, retryAfterSec: 60 }))
    const limited = checkOrderRateLimit(req, "test-bucket")
    expect(limited).not.toBeNull()
    expect(limited!.status).toBe(429)
    expect(limited!.code).toBe("rate_limited")
  })
})

describe("verifyCartCustomer (onaylanmamis kullanici siparisi)", () => {
  it("musteriye bagli olmayan sepeti reddeder (misafir)", async () => {
    const scope = withModules({ customer: customerModule(null) })
    const result = await verifyCartCustomer(scope, makeCart({ customer_id: null }))
    expect(result.ok).toBe(false)
    expect(result.code).toBe("login_required")
    expect(result.status).toBe(401)
  })

  it("dogrulanmamis e-postali musteriyi reddeder", async () => {
    const scope = withModules({
      customer: customerModule({ id: "cus_1", metadata: { email_verified: false } }),
    })
    const result = await verifyCartCustomer(scope, makeCart())
    expect(result.ok).toBe(false)
    expect(result.code).toBe("email_not_verified")
    expect(result.status).toBe(403)
  })

  it("dogrulanmis musteriyi gecirir", async () => {
    const scope = withModules({ customer: customerModule(verifiedCustomer) })
    const result = await verifyCartCustomer(scope, makeCart())
    expect(result.ok).toBe(true)
  })

  it("ayar kapaliyken (orders.require_verified_customer=false) hepsini gecirir", async () => {
    const scope = withModules({
      storeSettings: settingsModule({ "orders.require_verified_customer": false }),
      customer: customerModule(null),
    })
    const result = await verifyCartCustomer(scope, makeCart({ customer_id: null }))
    expect(result.ok).toBe(true)
  })

  it("auth dogrulama politikasi kapaliysa giris yeterli (SMTP'siz kilitlenme olmaz)", async () => {
    const authMock = getAuthSettings as jest.Mock
    authMock.mockResolvedValueOnce({ verificationRequired: false })
    const scope = withModules({
      customer: customerModule({ id: "cus_1", metadata: { email_verified: false } }),
    })
    const result = await verifyCartCustomer(scope, makeCart())
    expect(result.ok).toBe(true)
  })
})

describe("requireVerifiedCustomerForOrder", () => {
  const makeReq = (actorId: string | null) => ({
    scope: null,
    auth_context: actorId ? { actor_id: actorId } : {},
  })

  it("girissiz istegi reddeder (login_required)", async () => {
    const result = await requireVerifiedCustomerForOrder(makeReq(null))
    expect(result.ok).toBe(false)
    expect(result.code).toBe("login_required")
  })

  it("ayar kapaliyken girissiz istege izin verir (misafir siparis)", async () => {
    const req: any = makeReq(null)
    req.scope = withModules({
      storeSettings: settingsModule({ "orders.require_verified_customer": false }),
    })
    const result = await requireVerifiedCustomerForOrder(req)
    expect(result.ok).toBe(true)
  })

  it("girisli dogrulanmis musteriyi gecirir ve dondurur", async () => {
    const req: any = makeReq("cus_1")
    req.scope = withModules({ customer: customerModule(verifiedCustomer) })
    const result = await requireVerifiedCustomerForOrder(req)
    expect(result.ok).toBe(true)
    expect((result as any).customer?.email).toBe("buyer@example.com")
  })
})
