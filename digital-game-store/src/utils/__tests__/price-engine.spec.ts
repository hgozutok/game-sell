/**
 * Fiyat motoru testleri: kur donusumu, marj, yuvarlama (.99), min-kar guard,
 * kural onceligi (kategori-id > platform > genre > provider > default).
 */
import { computeSellingPrice, resolveMargin, roundPrice } from "../price-engine"

// 1 USD = 0.92 EUR (eur minor -> usd minor: /0.92)
const RATES = { usd: 1, eur: 0.92, try: 34.5 }

describe("roundPrice", () => {
  it("ninety_nine: X.34 -> X.99", () => {
    expect(roundPrice(1234, "ninety_nine")).toEqual({ priceMinor: 1299, deltaMinor: 65 })
  })

  it("ninety_nine: zaten X.99 degismez", () => {
    expect(roundPrice(1299, "ninety_nine").priceMinor).toBe(1299)
  })

  it("none: yakin tam sayiya yuvarlar", () => {
    expect(roundPrice(1250, "none").priceMinor).toBe(1250)
    expect(roundPrice(1250.6, "none").priceMinor).toBe(1251)
  })
})

describe("computeSellingPrice", () => {
  it("EUR maliyet -> USD satis + marj", () => {
    // 10.00 EUR = 1000 eur-minor -> ~1087 usd-minor; %20 marj -> 1304
    const r = computeSellingPrice({
      costMinor: 1000,
      fromCurrency: "eur",
      rates: RATES,
      marginPct: 20,
      roundingRule: "none",
      minProfitPct: 5,
    })
    expect(r.costUsdMinor).toBe(1087)
    expect(r.sellMinor).toBe(Math.round(1087 * 1.2))
    expect(r.negative).toBe(false)
    expect(r.breakdown.beforeRoundingMinor).toBe(1304)
  })

  it(".99 yuvarlama uygulanir ve breakdown delta raporlar", () => {
    const r = computeSellingPrice({
      costMinor: 1000,
      fromCurrency: "eur",
      rates: RATES,
      marginPct: 20,
      roundingRule: "ninety_nine",
      minProfitPct: 5,
    })
    expect(r.sellMinor % 100).toBe(99)
    expect(r.breakdown.roundingDeltaMinor).toBe(r.sellMinor - r.breakdown.beforeRoundingMinor)
  })

  it("min-kar guard: satis < maliyet*(1+minProfit) ise negative=true", () => {
    const r = computeSellingPrice({
      costMinor: 1000,
      fromCurrency: "eur",
      rates: RATES,
      marginPct: 0, // marjsiz
      roundingRule: "none",
      minProfitPct: 10,
    })
    expect(r.negative).toBe(true)
  })

  it("ayni para biriminde kur uygulanmaz", () => {
    const r = computeSellingPrice({
      costMinor: 1000,
      fromCurrency: "usd",
      rates: RATES,
      marginPct: 0,
      roundingRule: "none",
      minProfitPct: 0,
    })
    expect(r.costUsdMinor).toBe(1000)
    expect(r.sellMinor).toBe(1000)
    expect(r.negative).toBe(false)
  })
})

describe("resolveMargin — kural onceligi", () => {
  const rules = [
    { provider: "kinguin", category_name: "Steam", margin_percentage: 15, priority: 1, is_active: true },
    { provider: "kinguin", category_name: "Action", margin_percentage: 18, priority: 2, is_active: true },
    { provider: "kinguin", margin_percentage: 12, is_active: true }, // provider-genel
    { provider: "kinguin", category_name: "Pasif", margin_percentage: 99, is_active: false },
  ]

  it("platform eslesmesi provider-genel'den once gelir", () => {
    const r = resolveMargin(rules, {
      provider: "kinguin",
      platform: "Steam",
      genre: "Action",
      defaultMarginPct: 10,
    })
    expect(r).toEqual({ marginPct: 15, source: "platform" })
  })

  it("platform yoksa genre kurali kullanilir", () => {
    const r = resolveMargin(rules, {
      provider: "kinguin",
      platform: null,
      genre: "Action",
      defaultMarginPct: 10,
    })
    expect(r).toEqual({ marginPct: 18, source: "genre" })
  })

  it("eslesme yoksa provider-genel kural", () => {
    const r = resolveMargin(rules, {
      provider: "kinguin",
      platform: "Epic",
      genre: "RPG",
      defaultMarginPct: 10,
    })
    expect(r).toEqual({ marginPct: 12, source: "provider" })
  })

  it("pasif kurallar hicbir zaman secilmez", () => {
    const r = resolveMargin(rules, {
      provider: "kinguin",
      platform: "Pasif",
      defaultMarginPct: 10,
    })
    expect(r.marginPct).not.toBe(99)
  })

  it("kural yoksa varsayilan marj", () => {
    const r = resolveMargin([], { provider: "kinguin", platform: "Steam", defaultMarginPct: 25 })
    expect(r).toEqual({ marginPct: 25, source: "default" })
  })

  it("kategori-id eslesmesi en yuksek oncelik + priority tie-break", () => {
    const withId = [
      ...rules,
      { provider: "kinguin", category_id: "cat-1", margin_percentage: 22, priority: 1, is_active: true },
      { provider: "kinguin", category_id: "cat-1", margin_percentage: 30, priority: 5, is_active: true },
    ]
    const r = resolveMargin(withId, {
      provider: "kinguin",
      platform: "Steam",
      categoryId: "cat-1",
      defaultMarginPct: 10,
    })
    expect(r).toEqual({ marginPct: 30, source: "category-id" })
  })
})
