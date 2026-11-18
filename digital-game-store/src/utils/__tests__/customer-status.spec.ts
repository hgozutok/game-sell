/**
 * Musteri aktif/pasif durumu ve siparis ozeti yardimcilari.
 */
import {
  buildCustomerStatusMetadata,
  customerAdminView,
  isCustomerDisabled,
  orderTotalMinor,
  summarizeCustomerOrders,
} from "../customer-status"

describe("isCustomerDisabled", () => {
  it("metadata.disabled true ise pasif sayar", () => {
    expect(isCustomerDisabled({ disabled: true })).toBe(true)
  })

  it("alan yoksa veya farkli deger varsa aktif sayar", () => {
    expect(isCustomerDisabled(undefined)).toBe(false)
    expect(isCustomerDisabled({})).toBe(false)
    expect(isCustomerDisabled({ disabled: "true" })).toBe(false)
    expect(isCustomerDisabled({ disabled: false })).toBe(false)
  })
})

describe("buildCustomerStatusMetadata", () => {
  const now = new Date("2026-11-18T10:00:00.000Z")

  it("diger metadata alanlarini korur ve pasif damgasi yazar", () => {
    const result = buildCustomerStatusMetadata(
      { prefs: { locale: "tr" }, email_verified: true },
      false,
      now
    )
    expect(result).toEqual({
      prefs: { locale: "tr" },
      email_verified: true,
      disabled: true,
      disabled_at: "2026-11-18T10:00:00.000Z",
    })
  })

  it("aktif yaparken disabled_at temizler", () => {
    const result = buildCustomerStatusMetadata(
      { disabled: true, disabled_at: "2026-01-01T00:00:00.000Z" },
      true,
      now
    )
    expect(result.disabled).toBe(false)
    expect(result.disabled_at).toBeNull()
  })
})

describe("orderTotalMinor", () => {
  it("hazir total varsa onu kullanir", () => {
    expect(orderTotalMinor({ total: 1999, items: [{ unit_price: 1, quantity: 1 }] })).toBe(1999)
  })

  it("total yoksa kalemlerden hesaplar", () => {
    expect(
      orderTotalMinor({
        items: [
          { unit_price: 199, quantity: 2 },
          { unit_price: 500, quantity: 1 },
        ],
      })
    ).toBe(898)
  })
})

describe("summarizeCustomerOrders", () => {
  it("siparis sayisi, para birimi bazli toplam ve son siparis tarihini doner", () => {
    const summary = summarizeCustomerOrders([
      { total: 199, currency_code: "usd", created_at: "2026-11-01T10:00:00.000Z" },
      { total: 500, currency_code: "usd", created_at: "2026-11-10T10:00:00.000Z" },
      { total: 100, currency_code: "eur", created_at: "2026-11-05T10:00:00.000Z" },
    ])

    expect(summary.order_count).toBe(3)
    expect(summary.total_spent).toBe(799)
    expect(summary.currency_code).toBe("usd")
    expect(summary.currency_totals).toEqual([
      { currency_code: "usd", total: 699 },
      { currency_code: "eur", total: 100 },
    ])
    expect(summary.last_order_at).toBe("2026-11-10T10:00:00.000Z")
  })

  it("siparisi olmayan musteri icin bos ozet doner", () => {
    const summary = summarizeCustomerOrders([])
    expect(summary).toEqual({
      order_count: 0,
      total_spent: 0,
      currency_code: null,
      currency_totals: [],
      last_order_at: null,
    })
  })
})

describe("customerAdminView", () => {
  it("metadata sizdirmaz, durum alanlarini acikca doner", () => {
    const view = customerAdminView({
      id: "cus_1",
      email: "a@b.com",
      first_name: "Ada",
      last_name: "Lovelace",
      has_account: true,
      created_at: "2026-01-01T00:00:00.000Z",
      metadata: {
        password_hash: "gizli",
        disabled: true,
        disabled_at: "2026-02-01T00:00:00.000Z",
        email_verified: true,
      },
    })

    expect(view).toEqual({
      id: "cus_1",
      email: "a@b.com",
      first_name: "Ada",
      last_name: "Lovelace",
      phone: null,
      has_account: true,
      created_at: "2026-01-01T00:00:00.000Z",
      active: false,
      disabled_at: "2026-02-01T00:00:00.000Z",
      email_verified: true,
    })
    expect(JSON.stringify(view)).not.toContain("gizli")
  })
})
