/**
 * Fiyat motoru — saglayici maliyetinden satis fiyatini hesaplar.
 *
 *   cost (EUR) -> kur -> USD -> marj kurali (urun override > platform/genre kurali > varsayilan)
 *   -> yuvarlama (.99) -> min kar guard
 *
 * Tum import/sync/listeleme yollari TEK bu fonksiyonu kullanir; marj kurallari
 * pricing-settings modulunden, kur ve yuvarlama kinguin settings'ten gelir.
 */
import { convertCurrencyAmount } from "./currency"

export interface PriceRuleLike {
  category_name?: string | null
  category_id?: string | null
  provider?: string | null
  margin_percentage: number
  min_price?: number | null
  max_price?: number | null
  is_active?: boolean
  priority?: number
}

export interface PriceInput {
  /** Saglayici maliyeti (minor unit, saglayici para biriminde — eur) */
  costMinor: number
  fromCurrency: string
  rates: Record<string, number>
  marginPct: number
  roundingRule: "none" | "ninety_nine"
  minProfitPct: number
}

export interface PriceResult {
  /** Satis fiyati (minor, usd) */
  sellMinor: number
  /** Maliyetin USD karsiligi (minor) */
  costUsdMinor: number
  marginPct: number
  rounding: "none" | "ninety_nine"
  /** satis <= maliyet * (1 + minProfitPct/100) */
  negative: boolean
  /** Kurallari gosteren kirilim (admin onizlemesi icin) */
  breakdown: {
    costUsdMinor: number
    marginPct: number
    marginSource: string
    beforeRoundingMinor: number
    roundingDeltaMinor: number
  }
}

export function roundPrice(sellMinor: number, rule: "none" | "ninety_nine"): {
  priceMinor: number
  deltaMinor: number
} {
  if (rule === "ninety_nine") {
    // X.99 formatina yuvarla: 12.34 -> 12.99 ; 12.99 -> 12.99
    const whole = Math.floor(sellMinor / 100)
    const target = whole * 100 + 99
    if (target >= 99 && target >= sellMinor - 100) {
      return { priceMinor: target, deltaMinor: target - sellMinor }
    }
  }
  return { priceMinor: Math.round(sellMinor), deltaMinor: 0 }
}

export function computeSellingPrice(input: PriceInput): PriceResult {
  const {
    costMinor,
    fromCurrency,
    rates,
    marginPct,
    roundingRule,
    minProfitPct,
  } = input

  const costUsdMinor = convertCurrencyAmount(costMinor, fromCurrency, "usd", rates)
  const beforeRounding = Math.round(costUsdMinor * (1 + marginPct / 100))
  const { priceMinor, deltaMinor } = roundPrice(beforeRounding, roundingRule)
  const negative =
    priceMinor < Math.round(costUsdMinor * (1 + minProfitPct / 100))

  return {
    sellMinor: priceMinor,
    costUsdMinor,
    marginPct,
    rounding: roundingRule,
    negative,
    breakdown: {
      costUsdMinor,
      marginPct,
      marginSource: "rule",
      beforeRoundingMinor: beforeRounding,
      roundingDeltaMinor: deltaMinor,
    },
  }
}

/**
 * Uygun marj kuralini bul: urun override > kategori (platform/genre) kurali > varsayilan.
 * rules: pricing-settings modulunden gelen aktif kurallar.
 */
export function resolveMargin(
  rules: PriceRuleLike[],
  opts: {
    provider: string
    platform?: string | null
    genre?: string | null
    categoryId?: string | null
    defaultMarginPct: number
  }
): { marginPct: number; source: string } {
  const { provider, platform, genre, categoryId, defaultMarginPct } = opts
  const active = rules.filter((r) => r.is_active !== false)

  const matches = (r: PriceRuleLike, categoryName?: string | null) =>
    r.provider === "all" ||
    r.provider === provider ||
    (!r.provider && provider) // kuralsiz provider -> kabul

  // 1) kategori id eslesmesi
  if (categoryId) {
    const byId = active
      .filter((r) => r.category_id === categoryId && matches(r))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    if (byId.length) return { marginPct: byId[0].margin_percentage, source: "category-id" }
  }

  // 2) platform ismine eslesen kural
  if (platform) {
    const byPlatform = active
      .filter(
        (r) =>
          matches(r) &&
          r.category_name &&
          r.category_name.toLowerCase() === String(platform).toLowerCase()
      )
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    if (byPlatform.length) return { marginPct: byPlatform[0].margin_percentage, source: "platform" }
  }

  // 3) genre ismine eslesen kural
  if (genre) {
    const byGenre = active
      .filter(
        (r) =>
          matches(r) &&
          r.category_name &&
          r.category_name.toLowerCase() === String(genre).toLowerCase()
      )
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    if (byGenre.length) return { marginPct: byGenre[0].margin_percentage, source: "genre" }
  }

  // 4) provider-genel kural
  const byProvider = active
    .filter((r) => r.provider === provider && !r.category_name && !r.category_id)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  if (byProvider.length) return { marginPct: byProvider[0].margin_percentage, source: "provider" }

  return { marginPct: defaultMarginPct, source: "default" }
}
