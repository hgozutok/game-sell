/**
 * payment-verification birim testleri: gercek capture kaydi dogrulamasi,
 * kismi tahsilat reddi, admin onay yolu ve parasiz durum reddi.
 */
import {
  expectedOrderTotalMinor,
  getOrderPayments,
  verifyOrderPaymentCaptured,
} from "../payment-verification"
import { Modules } from "@medusajs/framework/utils"

function makeContainer(params: {
  order?: any
  payments?: any[]
}) {
  const orderModule = {
    retrieveOrder: async () => {
      if (!params.order) throw new Error("not found")
      return params.order
    },
  }
  const paymentModule = {
    listPayments: async () => params.payments || [],
  }
  const query = {
    graph: async () => ({
      data: [{ id: params.order?.id ?? "order_1", payment_collections: [{ id: "paycol_1" }] }],
    }),
  }
  return {
    resolve: (name: string) => {
      if (name === Modules.ORDER || name === "order") return orderModule
      if (name === Modules.PAYMENT) return paymentModule
      if (name === "query" || name === ContainerRegistrationKeys.QUERY) return query
      if (name === "logger") return { warn: () => {} }
      throw new Error(`unexpected: ${name}`)
    },
  }
}

const paidOrder = {
  id: "order_1",
  total: 4999,
  currency_code: "usd",
  metadata: {},
  items: [{ unit_price: 4999, quantity: 1 }],
}

describe("expectedOrderTotalMinor", () => {
  it("order.total varsa onu kullanir", () => {
    expect(expectedOrderTotalMinor({ total: 4999, items: [] })).toBe(4999)
  })

  it("total yoksa satirlardan hesaplar", () => {
    expect(
      expectedOrderTotalMinor({ items: [{ unit_price: 2000, quantity: 2 }, { unit_price: 500, quantity: 1 }] })
    ).toBe(4500)
  })
})

describe("verifyOrderPaymentCaptured", () => {
  it("capture edilmis odemeyi onaylar", async () => {
    const container = makeContainer({
      order: paidOrder,
      payments: [
        { id: "pay_1", provider_id: "pp_stripe_stripe", status: "captured", captured_amount: 4999, amount: 4999 },
      ],
    })
    const result = await verifyOrderPaymentCaptured(container, "order_1")
    expect(result.paid).toBe(true)
    expect(result.source).toBe("capture")
    expect(result.paymentId).toBe("pay_1")
  })

  it("captured_at set edilmis odemeyi onaylar (status farkli olsa bile)", async () => {
    const container = makeContainer({
      order: paidOrder,
      payments: [
        { id: "pay_2", provider_id: "pp_paypal_paypal", status: "authorized", captured_at: new Date(), amount: 4999 },
      ],
    })
    const result = await verifyOrderPaymentCaptured(container, "order_1")
    expect(result.paid).toBe(true)
    expect(result.source).toBe("capture")
  })

  it("pending (authorize) odemeyi reddeder — para henuz alinmamis", async () => {
    const container = makeContainer({
      order: paidOrder,
      payments: [
        { id: "pay_3", provider_id: "pp_stripe_stripe", status: "pending", amount: 4999 },
      ],
    })
    const result = await verifyOrderPaymentCaptured(container, "order_1")
    expect(result.paid).toBe(false)
    expect(result.reason).toContain("capture")
  })

  it("kismi tahsili reddeder (tutar eksik)", async () => {
    const container = makeContainer({
      order: paidOrder,
      payments: [
        { id: "pay_4", provider_id: "pp_stripe_stripe", status: "captured", captured_amount: 1000, amount: 4999 },
      ],
    })
    const result = await verifyOrderPaymentCaptured(container, "order_1")
    expect(result.paid).toBe(false)
  })

  it("odeme kaydi hic yoksa reddeder", async () => {
    const container = makeContainer({ order: paidOrder, payments: [] })
    const result = await verifyOrderPaymentCaptured(container, "order_1")
    expect(result.paid).toBe(false)
    expect(result.reason).toContain("odeme kaydi yok")
  })

  it("admin onayli havalesi onaylar (payment_approved=true)", async () => {
    const container = makeContainer({
      order: {
        ...paidOrder,
        metadata: { payment_approved: true, payment_approved_by: "admin-1" },
      },
      payments: [],
    })
    const result = await verifyOrderPaymentCaptured(container, "order_1")
    expect(result.paid).toBe(true)
    expect(result.source).toBe("admin_approved")
  })

  it("allowAdminApproved=false iken admin onayini kabul etmez", async () => {
    const container = makeContainer({
      order: { ...paidOrder, metadata: { payment_approved: true } },
      payments: [],
    })
    const result = await verifyOrderPaymentCaptured(container, "order_1", {
      allowAdminApproved: false,
    })
    expect(result.paid).toBe(false)
  })

  it("bir odeme pending, digeri captured ise onaylar", async () => {
    const container = makeContainer({
      order: paidOrder,
      payments: [
        { id: "pay_5", provider_id: "pp_system_default", status: "pending", amount: 4999 },
        { id: "pay_6", provider_id: "pp_stripe_stripe", status: "captured", captured_amount: 4999, amount: 4999 },
      ],
    })
    const result = await verifyOrderPaymentCaptured(container, "order_1")
    expect(result.paid).toBe(true)
    expect(result.paymentId).toBe("pay_6")
  })

  it("siparis bulunamazsa reddeder", async () => {
    const container = makeContainer({ payments: [] })
    const result = await verifyOrderPaymentCaptured(container, "missing")
    expect(result.paid).toBe(false)
  })

  it("getOrderPayments collection id'lerini sorguyla ceker", async () => {
    const container = makeContainer({ order: paidOrder, payments: [] })
    const payments = await getOrderPayments(container, "order_1")
    expect(payments).toEqual([])
  })
})
