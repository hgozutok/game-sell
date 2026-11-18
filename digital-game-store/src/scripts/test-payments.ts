import { Modules } from "@medusajs/framework/utils"

/**
 * Odeme saglayicilari duman testi.
 *
 * Her kayitli saglayici icin gecici bir payment collection + session acar,
 * sonucu raporlar ve temizler. Harici API gerektiren saglayicilarda anahtar
 * yoksa saglayici zaten kayitli olmaz (bkz. medusa-config.ts).
 *
 * Calistirma:
 *   npx medusa exec ./src/scripts/test-payments.ts
 */
export default async function testPayments({ container }: any) {
  const payment = container.resolve(Modules.PAYMENT) as any

  const env = {
    STRIPE_API_KEY: Boolean(process.env.STRIPE_API_KEY),
    STRIPE_WEBHOOK_SECRET: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    PAYPAL_CLIENT_ID: Boolean(process.env.PAYPAL_CLIENT_ID),
    PAYPAL_CLIENT_SECRET: Boolean(process.env.PAYPAL_CLIENT_SECRET),
    PAYPAL_ENV: process.env.PAYPAL_ENV || "(varsayilan: sandbox)",
    MOLLIE_API_KEY: Boolean(process.env.MOLLIE_API_KEY),
  }

  const providers = await payment.listPaymentProviders({})

  const rows: Array<Record<string, any>> = []

  for (const provider of providers) {
    const row: Record<string, any> = {
      provider: provider.id,
      enabled: provider.is_enabled,
    }

    // Stripe eklentisi her odeme yontemi icin ayri saglayici kaydediyor
    // (bancontact, blik, ideal...). Magaza yalnizca standart kart akisini
    // kullaniyor; digerleri hesapta etkin olmadigi icin test edilmiyor.
    if (/^pp_stripe-.+_stripe$/.test(provider.id)) {
      row.result = "ATLANDI (ek odeme yontemi)"
      rows.push(row)
      continue
    }

    if (!provider.is_enabled) {
      row.result = "PASIF"
      rows.push(row)
      continue
    }

    let collection: any = null
    let intentToCancel: string | null = null
    let paypalOrderToCancel: string | null = null
    try {
      collection = await payment.createPaymentCollections({
        currency_code: "usd",
        amount: 10,
      })

      const session = await payment.createPaymentSession(collection.id, {
        provider_id: provider.id,
        amount: 10,
        currency_code: "usd",
        context: {},
      })

      row.result = "OK"
      row.session_status = session?.status
      row.session_data_keys = Object.keys(session?.data || {})

      // Canli Stripe anahtarinda test sirasinda olusan PaymentIntent'i iptal et
      // (para cekilmez, kayit kirliligi kalmasin).
      if (String(provider.id).includes("stripe") && session?.data?.id) {
        intentToCancel = String(session.data.id)
      }

      // PayPal'da test icin acilan siparisi iptal et (onaysiz siparis zaten
      // tahsil edilmez; kayit kalmasin).
      if (String(provider.id).includes("paypal") && session?.data?.id) {
        paypalOrderToCancel = String(session.data.id)
      }
    } catch (e: any) {
      row.result = "HATA"
      row.error = String(e?.message || e).slice(0, 300)
    } finally {
      if (intentToCancel && process.env.STRIPE_API_KEY) {
        try {
          await fetch(`https://api.stripe.com/v1/payment_intents/${intentToCancel}/cancel`, {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.STRIPE_API_KEY}` },
          })
          row.test_intent_canceled = true
        } catch {
          row.test_intent_canceled = false
        }
      }

      if (paypalOrderToCancel && process.env.PAYPAL_CLIENT_ID) {
        try {
          const base =
            String(process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live"
              ? "https://api-m.paypal.com"
              : "https://api-m.sandbox.paypal.com"
          const basic = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
          ).toString("base64")
          const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${basic}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          })
          const tokenJson: any = await tokenRes.json()
          await fetch(`${base}/v2/checkout/orders/${paypalOrderToCancel}/cancel`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenJson.access_token}` },
          })
          row.test_paypal_order_canceled = true
        } catch {
          row.test_paypal_order_canceled = false
        }
      }
      if (collection?.id) {
        await payment
          .deletePaymentCollections(collection.id)
          .catch(() => undefined)
      }
    }

    rows.push(row)
  }

  const report = {
    env,
    providers: rows.map((r) => ({
      provider: r.provider,
      enabled: r.enabled,
      result: r.result,
      status: r.session_status,
      test_intent_canceled: r.test_intent_canceled,
      test_paypal_order_canceled: r.test_paypal_order_canceled,
      error: r.error,
    })),
    note:
      "Stripe/PayPal anahtari yoksa saglayici kayitli olmaz (checkout'ta gorunmez). " +
      "PayPal anahtari girilince sandbox'ta gercek siparis/capture testi yapilabilir.",
  }

  // eslint-disable-next-line no-console
  console.log("PAYMENT_TEST_RESULT " + JSON.stringify(report, null, 2))

  return report
}
