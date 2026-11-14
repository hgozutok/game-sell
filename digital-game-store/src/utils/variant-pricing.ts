// Variant satis fiyatini sunucu tarafinda cozumler — istemci fiyati asla guvenilmez.
// Siralama: price set (pricing module) -> variant.prices (eski yapisal fallback)
// -> kinguin maliyet + marj fallback. Hepsi minor unit (kurus) doner.
import { Modules, ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"
import { computePriceForKinguinProduct } from "./kinguin-sync"
import { convertCurrencyAmount } from "./currency"

export interface ResolvedVariantPrice {
  unitPriceMinor: number
  currency: string
  title?: string
}

export async function resolveVariantUnitPrice(
  scope: any,
  variantId: string,
  targetCurrency: string,
  rates: Record<string, number>
): Promise<ResolvedVariantPrice> {
  const productModule = scope.resolve(Modules.PRODUCT) as any
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as any
  let title: string | undefined

  try {
    // 1) query.graph + QueryContext — store API'nin kullandigi kanonik yol.
    //    Hedef kurda fiyat listesi yoksa usd baz fiyattan kura cevrilir.
    const graphPrice = async (currency: string) => {
      const { data } = await query.graph({
        entity: "product_variant",
        fields: [
          "id",
          "title",
          "calculated_price.calculated_amount",
          "calculated_price.currency_code",
        ],
        filters: { id: variantId },
        context: {
          calculated_price: QueryContext({ currency_code: currency }),
        },
      })
      return (data || [])[0]
    }

    try {
      const v = await graphPrice(targetCurrency)
      if (v?.title) title = String(v.title)
      const amount = v?.calculated_price?.calculated_amount
      if (typeof amount === "number" && amount > 0) {
        return { unitPriceMinor: Math.round(amount), currency: targetCurrency, title }
      }

      // hedef kurda fiyat yok — usd baz fiyati kur ile cevir
      const base = await graphPrice("usd")
      const baseAmount = base?.calculated_price?.calculated_amount
      if (typeof baseAmount === "number" && baseAmount > 0) {
        const converted = convertCurrencyAmount(baseAmount, "usd", targetCurrency, rates)
        return { unitPriceMinor: Math.round(converted), currency: targetCurrency, title }
      }
      console.warn(
        `[variant-pricing] graph fiyati yok: variant=${variantId} cur=${targetCurrency} usd=${baseAmount}`
      )
    } catch (e: any) {
      console.warn(`[variant-pricing] graph hatasi: ${e?.message}`)
    }

    // 2) Price set uzerinden ham fiyatlar
    let prices: any[] = []
    try {
      const remoteLink = scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any
      const pricingModule = scope.resolve(Modules.PRICING) as any
      const links = await remoteLink.list({
        [Modules.PRODUCT]: { variant_id: variantId },
      })
      const priceSetId = links?.[0]?.pricing?.price_set_id
      if (priceSetId) {
        const priceSet = await pricingModule.retrievePriceSet(priceSetId, {
          relations: ["prices"],
        })
        prices = priceSet?.prices || []
      }
    } catch {
      /* fiyat seti yok — fallback asagida */
    }

    // 3) Variant uzerinden direkt fiyatlar (eski yapisal fallback)
    if (prices.length === 0) {
      const variants = await productModule
        .listProductVariants({ id: variantId }, { relations: ["prices"] })
        .catch(() => [])
      const variant = Array.isArray(variants) ? variants[0] : variants
      prices = Array.isArray(variant?.prices) ? variant.prices : []
      if (variant?.title) title = String(variant.title)
    }

    // 3b) Direkt para birimi eslesmesi, yoksa ilk fiyat kur cevrimiyle
    if (prices.length > 0) {
      const direct = prices.find(
        (p) => String(p.currency_code || "").toLowerCase() === targetCurrency
      )
      if (direct && typeof direct.amount === "number") {
        return { unitPriceMinor: Math.round(Number(direct.amount)), currency: targetCurrency, title }
      }
      const base = prices[0]
      const fromCur = String(base.currency_code || "usd").toLowerCase()
      const baseAmt = Number(base?.amount || 0)
      let converted = baseAmt
      try {
        converted = convertCurrencyAmount(baseAmt, fromCur, targetCurrency, rates)
      } catch {
        /* cevrim basarisizsa ham tutar */
      }
      return { unitPriceMinor: Math.round(converted), currency: targetCurrency, title }
    }

    // 4) Kinguin maliyet + marj fallback (usd minor)
    try {
      const kinguin = scope.resolve("kinguin") as any
      const kSettings = await kinguin.getSettings()
      const kpRows =
        (await kinguin.listKinguinProducts({ medusa_variant_id: variantId }).catch(() => [])) || []
      let kp = kpRows[0]
      if (!kp) {
        const prod = await productModule
          .retrieveProduct((await productModule.retrieveVariant(variantId)).product_id, {
            relations: [],
          })
          .catch(() => null)
        if (prod) {
          const rows = await kinguin
            .listKinguinProducts({ medusa_product_id: prod.id })
            .catch(() => [])
          kp = rows[0]
        }
      }
      if (kp) {
        const computed = await computePriceForKinguinProduct(scope, kp, kSettings)
        if (!computed.negative && computed.sellMinor > 0) {
          const converted = convertCurrencyAmount(computed.sellMinor, "usd", targetCurrency, rates)
          return {
            unitPriceMinor: Math.round(converted),
            currency: targetCurrency,
            title: title || String(kp.name),
          }
        }
      }
    } catch {
      /* kinguin fallback opsiyonel */
    }
  } catch {
    /* genel hata — 0 dondur, cagiran taraf karar verir */
  }

  return { unitPriceMinor: 0, currency: targetCurrency, title }
}
