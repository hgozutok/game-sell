/**
 * Kinguin senkronizasyon ve magaza listeleme orkestrasyonu.
 * Sync job'lari, "sync-now" ve listeleme admin rotalari TEK bu modulu kullanir.
 */
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { computeSellingPrice, resolveMargin } from "./price-engine"
import { getCurrencyRates, convertCurrencyAmount } from "./currency"
import { normalizeKinguinRegion } from "./kinguin"

const PLACEHOLDER_IMG = "https://placehold.co/600x400/1a1d24/ff6b35?text=No+Image"

type AnyService = any

export interface KinguinProductRow {
  id: string
  kinguin_id: string
  product_id: string | null
  name: string
  platform: string | null
  genre: string | null
  region_id: number | null
  region_limitations: string | null
  qty: number
  text_qty: number
  price: number // saglayici parasinda MINOR UNIT (kurus) — API float, depolama kurus
  currency: string
  images: { cover?: string; screenshots?: string[] } | null
  genres: string[] | null
  store_listed: boolean
  medusa_product_id: string | null
  medusa_variant_id: string | null
  pending_price: number | null
  pending_cost: number | null
  [key: string]: any
}

export interface SyncSummary {
  status: "completed" | "failed" | "skipped"
  reason?: string
  itemsTotal?: number
  added?: number
  updated?: number
  failed?: number
  repriced?: number
  pendingApprovals?: number
  hidden?: number
  unhidden?: number
  logId?: string
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

async function getServices(container: any) {
  const scope = container.scope ?? container
  return {
    kinguin: scope.resolve("kinguin") as AnyService,
    storeSettings: scope.resolve("storeSettings") as AnyService,
    pricingSettings: scope.resolve("pricingSettings") as AnyService,
    productModule: scope.resolve("product") as AnyService,
    salesChannelModule: scope.resolve(Modules.SALES_CHANNEL) as AnyService,
    remoteLink: scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as AnyService,
    logger: scope.resolve(ContainerRegistrationKeys.LOGGER) as AnyService,
  }
}

async function getDefaultSalesChannelId(salesChannelModule: AnyService): Promise<string | null> {
  const channels =
    (await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" })) ||
    (await salesChannelModule.listSalesChannels({}))
  return channels?.[0]?.id ?? null
}

/**
 * Varyantin USD fiyatini ayarlar — Medusa 2.11'de fiyatlama fiyat modulu uzerinden
 * yurutulur (variant -> price_set link). Import rotasinin kanitlanmis deseni.
 */
export async function updateVariantPrice(
  container: any,
  variantId: string,
  amountUsdMinor: number
): Promise<void> {
  const scope = container.scope ?? container
  const pricingModule = scope.resolve(Modules.PRICING) as AnyService
  const remoteLink = scope.resolve(ContainerRegistrationKeys.REMOTE_LINK) as AnyService
  const productModule = scope.resolve("product") as AnyService

  // Varyantin mevcut price set'ini bul
  let priceSetId: string | null = null
  try {
    const links = await remoteLink.list({
      [Modules.PRODUCT]: { variant_id: variantId },
    })
    priceSetId = links?.[0]?.pricing?.price_set_id ?? null
  } catch {
    priceSetId = null
  }

  const prices = [{ amount: amountUsdMinor, currency_code: "usd" }]

  if (priceSetId) {
    await pricingModule.updatePriceSets(priceSetId, { prices })
    return
  }

  // Price set yok: olustur + linkle
  const priceSet = await pricingModule.createPriceSets({ prices })
  await remoteLink.create([
    {
      [Modules.PRODUCT]: { variant_id: variantId },
      [Modules.PRICING]: { price_set_id: priceSet.id },
    },
  ])
  void productModule
}

// ===================== Fiyatlandirma =====================

export interface ComputedPrice {
  sellMinor: number
  costUsdMinor: number
  marginPct: number
  marginSource: string
  negative: boolean
}

export async function computePriceForKinguinProduct(
  container: any,
  kp: KinguinProductRow,
  settings: any,
  overrides: { marginOverridePct?: number; overridePriceMinor?: number } = {}
): Promise<ComputedPrice> {
  const { kinguin, storeSettings, pricingSettings } = await getServices(container)

  const rates = await getCurrencyRates(storeSettings)
  const rules = await pricingSettings.getAllPricingRules({ is_active: true })

  const resolved = resolveMargin(rules, {
    provider: "kinguin",
    platform: kp.platform,
    genre: kp.genre,
    defaultMarginPct: settings.default_margin_pct ?? 15,
  })

  const marginPct = overrides.marginOverridePct ?? resolved.marginPct
  const costMinor = Number(kp.price) // zaten minor unit
  const currency = (kp.currency || "eur").toLowerCase()

  if (overrides.overridePriceMinor !== undefined) {
    const costUsdMinor = convertCurrencyAmount(costMinor, currency, "usd", rates)
    return {
      sellMinor: overrides.overridePriceMinor,
      costUsdMinor,
      marginPct,
      marginSource: "product-override",
      negative: overrides.overridePriceMinor < costUsdMinor,
    }
  }

  const result = computeSellingPrice({
    costMinor,
    fromCurrency: currency,
    rates,
    marginPct,
    roundingRule: settings.rounding_rule ?? "ninety_nine",
    minProfitPct: settings.min_profit_pct ?? 0,
  })

  return {
    sellMinor: result.sellMinor,
    costUsdMinor: result.costUsdMinor,
    marginPct,
    marginSource: resolved.source,
    negative: result.negative,
  }
}

// ===================== Magaza listeleme =====================

async function getOrCreateCollectionId(
  productModule: AnyService,
  title: string
): Promise<string | null> {
  try {
    const existing = await productModule.listProductCollections({ title })
    if (existing?.length) return existing[0].id
    const created = await productModule.createProductCollections({
      title,
      handle: slugify(title),
    })
    return created.id
  } catch {
    return null
  }
}

export async function listKinguinProduct(
  container: any,
  kp: KinguinProductRow,
  opts: { marginOverridePct?: number; overridePriceMinor?: number; publish?: boolean } = {}
): Promise<{ ok: boolean; negative?: boolean; productId?: string; variantId?: string; priceMinor?: number; error?: string }> {
  const { kinguin, productModule, remoteLink, salesChannelModule, logger } =
    await getServices(container)

  const settings = await kinguin.getSettings()

  if (settings.stop_on_negative_margin !== false) {
    const computed = await computePriceForKinguinProduct(container, kp, settings, {
      marginOverridePct: opts.marginOverridePct,
      overridePriceMinor: opts.overridePriceMinor,
    })
    if (computed.negative) {
      logger.warn(`[kinguin-sync] ${kp.name}: zararina satis engellendi (cost=${computed.costUsdMinor} sell=${computed.sellMinor})`)
      return { ok: false, negative: true }
    }
  }

  const computed = await computePriceForKinguinProduct(container, kp, settings, {
    marginOverridePct: opts.marginOverridePct,
    overridePriceMinor: opts.overridePriceMinor,
  })

  const cover = kp.images?.cover
  const thumbnail = cover || PLACEHOLDER_IMG
  const handle = `kinguin-${slugify(kp.name)}`
  const platformCollectionId = kp.platform
    ? await getOrCreateCollectionId(productModule, kp.platform)
    : null

  const metadata: Record<string, any> = {
    provider: "kinguin",
    provider_product_id: kp.product_id,
    kinguin_id: kp.kinguin_id,
    platform: kp.platform || "PC",
    region: normalizeKinguinRegion(kp.region_limitations || kp.region_id || "GLOBAL"),
    provider_region_code: kp.region_limitations || String(kp.region_id ?? ""),
    provider_image: thumbnail,
    original_price: kp.price,
    provider_currency: kp.currency || "eur",
    margin_applied: computed.marginPct,
    margin_source: computed.marginSource,
    imported_at: new Date().toISOString(),
    genres: kp.genres || [],
  }

  let productId = kp.medusa_product_id
  let variantId = kp.medusa_variant_id

  try {
    if (!productId) {
      const existing = await productModule.listProducts({ handle })
      if (existing?.length) productId = existing[0].id
    }

    if (productId) {
      await productModule.updateProducts(productId, {
        title: kp.name.substring(0, 255),
        thumbnail,
        images: [{ url: thumbnail }],
        status: opts.publish === false ? "draft" : "published",
        collection_ids: platformCollectionId ? [platformCollectionId] : undefined,
        metadata,
      })
    } else {
      const created = await productModule.createProducts({
        title: kp.name.substring(0, 255),
        handle,
        status: opts.publish === false ? "draft" : "published",
        thumbnail,
        images: [{ url: thumbnail }],
        collection_ids: platformCollectionId ? [platformCollectionId] : undefined,
        metadata,
      })
      productId = created.id
    }

    // Varyant: SKU ile bul veya yarat — fiyatlama price set uzerinden
    const sku = `KINGUIN-${kp.kinguin_id}`.substring(0, 100)
    if (!variantId) {
      const existingVariants = await productModule.listProductVariants({ sku }).catch(() => [])
      if (existingVariants?.length) {
        variantId = existingVariants[0].id
      } else if (productId) {
        const createdVariants = await productModule.createProductVariants([
          {
            product_id: productId,
            title: kp.platform ? `${kp.name} (${kp.platform})` : kp.name,
            sku,
            manage_inventory: false,
          },
        ])
        variantId = createdVariants[0].id
      }
    }

    if (variantId) {
      await updateVariantPrice(container, variantId, computed.sellMinor)
    }

    // Sales channel linki
    const channelId = await getDefaultSalesChannelId(salesChannelModule)
    if (channelId && productId) {
      try {
        await remoteLink.create([
          {
            [Modules.PRODUCT]: { product_id: productId },
            [Modules.SALES_CHANNEL]: { sales_channel_id: channelId },
          },
        ])
      } catch (e: any) {
        if (!String(e?.message || "").includes("already exists")) {
          logger.warn(`[kinguin-sync] sales channel link hatasi (${kp.name}): ${e?.message}`)
        }
      }
    }

    // Yerel kaydi guncelle
    await kinguin.updateKinguinProducts({
      id: kp.id,
      store_listed: true,
      medusa_product_id: productId,
      medusa_variant_id: variantId,
      pending_price: null,
      pending_cost: null,
    } as any)

    logger.info(`[kinguin-sync] ${kp.name}: listede (fiyat ${(computed.sellMinor / 100).toFixed(2)} USD, marj %${computed.marginPct})`)
    return { ok: true, productId: productId!, variantId: variantId ?? undefined, priceMinor: computed.sellMinor }
  } catch (e: any) {
    logger.error(`[kinguin-sync] listeleme hatasi (${kp.name}): ${e?.message}`)
    return { ok: false, error: e?.message }
  }
}

export async function unlistKinguinProduct(container: any, kp: KinguinProductRow): Promise<void> {
  const { kinguin, productModule } = await getServices(container)
  if (kp.medusa_product_id) {
    try {
      await productModule.updateProducts(kp.medusa_product_id, { status: "draft" })
    } catch {
      // urun zaten silinmis olabilir
    }
  }
  await kinguin.updateKinguinProducts({ id: kp.id, store_listed: false } as any)
}

// ===================== Senkronizasyon =====================

export async function shouldRunSync(container: any): Promise<{ due: boolean; reason?: string }> {
  const { kinguin } = await getServices(container)
  const settings = await kinguin.getSettings()
  if (!settings.last_sync_at) return { due: true, reason: "never-synced" }
  const elapsedMin = (Date.now() - new Date(settings.last_sync_at).getTime()) / 60000
  const interval = settings.sync_interval_minutes ?? 360
  if (elapsedMin >= interval) return { due: true, reason: `elapsed=${Math.round(elapsedMin)}min` }
  return { due: false, reason: `next in ${Math.round(interval - elapsedMin)}min` }
}

/**
 * Tam senkron: katalog -> yerel kinguin_product; fiyat/stok senkronu listelenenlere uygular.
 * Job tarafindan (interval dolunca) ve admin "sync-now" ile (force) calistirilir.
 */
export async function runKinguinSync(
  container: any,
  opts: { force?: boolean; updatedSince?: Date; maxPages?: number } = {}
): Promise<SyncSummary> {
  const { kinguin, productModule, logger } = await getServices(container)

  if (!opts.force) {
    const { due, reason } = await shouldRunSync(container)
    if (!due) return { status: "skipped", reason }
  }

  const settings = await kinguin.getSettings()
  const log = await kinguin.startSyncLog("full", {
    sync_prices: settings.sync_prices,
    sync_stock: settings.sync_stock,
    sync_info: settings.sync_info,
    max_pages: opts.maxPages ?? null,
  })

  const summary: SyncSummary = { status: "completed", logId: log.id }
  const errors: string[] = []

  try {
    // 1) Katalog senkronu — yerel kinguin_product tablosu
    const lastSync = opts.updatedSince ?? (settings.last_sync_at ? new Date(settings.last_sync_at) : undefined)
    let total = 0
    let added = 0
    let updated = 0
    let failed = 0

    const iterator = kinguin.iterateProducts(
      lastSync
        ? { updatedSince: lastSync.toISOString(), sortBy: "updatedAt", sortType: "desc" }
        : { sortBy: "updatedAt", sortType: "desc" },
      opts.maxPages ?? 500
    )

    for await (const product of iterator) {
      total++
      try {
        const existing = await kinguin.listKinguinProducts({ kinguin_id: product.kinguinId })
        if (existing.length === 0) {
          await kinguin.upsertLocalProduct(product)
          added++
        } else {
          await kinguin.upsertLocalProduct(product)
          updated++
        }
      } catch (e: any) {
        failed++
        if (errors.length < 10) errors.push(`upsert ${product.kinguinId}: ${e?.message}`)
      }
    }
    summary.itemsTotal = total
    summary.added = added
    summary.updated = updated
    summary.failed = failed

    // 2) Listelenen urunler icin fiyat + stok senkronu
    let repriced = 0
    let pendingApprovals = 0
    let hidden = 0
    let unhidden = 0

    if (settings.sync_prices || settings.sync_stock) {
      const listed = await kinguin.listKinguinProducts({ store_listed: true })
      for (const kp of listed as KinguinProductRow[]) {
        try {
          // ---- Fiyat ----
          if (settings.sync_prices && settings.auto_reprice && kp.medusa_variant_id) {
            const computed = await computePriceForKinguinProduct(container, kp, settings)
            const variantRows = await productModule
              .listProductVariants({ id: kp.medusa_variant_id })
              .catch(() => [])
            const variant = variantRows?.[0] ?? null
            const currentPrice =
              variant?.prices?.find((p: any) => p.currency_code === "usd")?.amount ?? 0

            if (currentPrice > 0) {
              const pctChange = (Math.abs(computed.sellMinor - currentPrice) / currentPrice) * 100
              if (pctChange <= (settings.max_price_change_pct ?? 30)) {
                if (Math.round(computed.sellMinor) !== currentPrice) {
                  if (!computed.negative) {
                    await updateVariantPrice(container, kp.medusa_variant_id, Math.round(computed.sellMinor))
                    await kinguin.updateKinguinProducts({
                      id: kp.id,
                      pending_price: null,
                      pending_cost: null,
                    } as any)
                    repriced++
                  }
                } else {
                  await kinguin.updateKinguinProducts({
                    id: kp.id,
                    pending_price: null,
                    pending_cost: null,
                  } as any)
                }
              } else {
                // Esik asildi: onaya duser
                await kinguin.updateKinguinProducts({
                  id: kp.id,
                  pending_price: Math.round(computed.sellMinor),
                  pending_cost: Math.round(Number(kp.price)),
                } as any)
                pendingApprovals++
              }
            }
          }

          // ---- Stok ----
          if (settings.sync_stock && settings.hide_on_zero_stock && kp.medusa_product_id) {
            const isZero = Number(kp.qty) <= 0
            if (isZero) {
              const product = await productModule.retrieveProduct(kp.medusa_product_id).catch(() => null)
              if (product?.status === "published") {
                await productModule.updateProducts(kp.medusa_product_id, { status: "draft" })
                hidden++
              }
            } else {
              const product = await productModule.retrieveProduct(kp.medusa_product_id).catch(() => null)
              if (product?.status === "draft") {
                await productModule.updateProducts(kp.medusa_product_id, { status: "published" })
                unhidden++
              }
            }
          }
        } catch (e: any) {
          if (errors.length < 10) errors.push(`sync ${kp.kinguin_id}: ${e?.message}`)
        }
      }
    }

    summary.repriced = repriced
    summary.pendingApprovals = pendingApprovals
    summary.hidden = hidden
    summary.unhidden = unhidden

    await kinguin.finishSyncLog(log.id, {
      status: "completed",
      items_total: total,
      items_added: added,
      items_updated: updated,
      items_failed: failed,
      pending_approvals: pendingApprovals,
      errors: errors.length ? errors : null,
      details: {
        repriced,
        hidden,
        unhidden,
        mode: lastSync ? "incremental" : "full",
      },
    })
    summary.logId = log.id
  } catch (e: any) {
    logger.error(`[kinguin-sync] senkron hatasi: ${e?.message}`)
    await kinguin.finishSyncLog(log.id, {
      status: "failed",
      errors: [String(e?.message || e)],
    })
    summary.status = "failed"
    summary.reason = e?.message
    summary.logId = log.id
  }

  await kinguin.updateSettings({ last_sync_at: new Date() } as any)
  return summary
}

/**
 * Sadece fiyat senkronu (hizli) — listelenen urunlerde maliyet degisimini uygular.
 */
export async function syncKinguinPrices(container: any): Promise<SyncSummary> {
  const { kinguin, productModule, logger } = await getServices(container)
  const settings = await kinguin.getSettings()
  const log = await kinguin.startSyncLog("price")

  let repriced = 0
  let pendingApprovals = 0
  let failed = 0
  const errors: string[] = []

  try {
    const listed = await kinguin.listKinguinProducts({ store_listed: true })
    for (const kp of listed as KinguinProductRow[]) {
      if (!kp.medusa_variant_id) continue
      try {
        const computed = await computePriceForKinguinProduct(container, kp, settings)
        const variantRows = await productModule
          .listProductVariants({ id: kp.medusa_variant_id })
          .catch(() => [])
        const variant = variantRows?.[0] ?? null
        const currentPrice = variant?.prices?.find((p: any) => p.currency_code === "usd")?.amount ?? 0

        if (currentPrice === 0) continue
        const pctChange = (Math.abs(computed.sellMinor - currentPrice) / currentPrice) * 100

        if (pctChange <= (settings.max_price_change_pct ?? 30)) {
          if (!computed.negative && Math.round(computed.sellMinor) !== currentPrice) {
            await updateVariantPrice(container, kp.medusa_variant_id, Math.round(computed.sellMinor))
            await kinguin.updateKinguinProducts({ id: kp.id, pending_price: null, pending_cost: null } as any)
            repriced++
          }
        } else {
          await kinguin.updateKinguinProducts({
            id: kp.id,
            pending_price: Math.round(computed.sellMinor),
            pending_cost: Math.round(Number(kp.price)),
          } as any)
          pendingApprovals++
        }
      } catch (e: any) {
        failed++
        if (errors.length < 10) errors.push(`price-sync ${kp.kinguin_id}: ${e?.message}`)
      }
    }

    await kinguin.finishSyncLog(log.id, {
      status: "completed",
      items_total: listed.length,
      items_updated: repriced,
      items_failed: failed,
      pending_approvals: pendingApprovals,
      errors: errors.length ? errors : null,
    })
    return {
      status: "completed",
      itemsTotal: listed.length,
      repriced,
      pendingApprovals,
      failed,
      logId: log.id,
    }
  } catch (e: any) {
    logger.error(`[kinguin-sync] fiyat senkronu hatasi: ${e?.message}`)
    await kinguin.finishSyncLog(log.id, { status: "failed", errors: [String(e?.message || e)] })
    return { status: "failed", reason: e?.message, logId: log.id }
  }
}

/**
 * Urun fotolari backfill — listeden gecmemis/eski import urunler dahil
 * magazadaki her Medusa urunune Kinguin gorselini tasir.
 * Oncelik: kinguin_product.images.cover -> screenshot[0] -> detay API cover.thumbnail
 */
export async function backfillProductImages(
  container: any,
  opts: { limit?: number } = {}
): Promise<{ updated: number; skipped: number; failed: number; details: string[] }> {
  const { kinguin, productModule, logger } = await getServices(container)
  const limit = opts.limit ?? 2000

  // 1) Tum Medusa store urunlerini cek (kinguin provider'lilar)
  const products = await productModule.listProducts({}, { take: limit, relations: [] })
  let updated = 0
  let skipped = 0
  let failed = 0
  const details: string[] = []

  // 2) kinguin_product kayitlarini isme gore indeksle (eski importlar baglantisisiz)
  const catalog = await kinguin.listKinguinProducts({})
  const byName = new Map<string, any>()
  const byMedusaId = new Map<string, any>()
  const byKinguinId = new Map<string, any>()
  for (const kp of catalog as KinguinProductRow[]) {
    if (kp.medusa_product_id) byMedusaId.set(kp.medusa_product_id, kp)
    byKinguinId.set(String(kp.kinguin_id), kp)
    byName.set(String(kp.name).trim().toLowerCase(), kp)
  }

  function bestImage(kp: KinguinProductRow): string | null {
    const cover = kp.images?.cover
    const shot = kp.images?.screenshots?.[0]
    return cover || shot || null
  }

  // Isim benzerligi tokenlari — CD Key/Global/EU gibi jenerik terimleri at
  const STOP = new Set(["cd","key","global","eu","us","uk","row","pc","region","free","activation","code","digital","steam","epic","games","battle","net","xbox","playstation","ps4","ps5","one","series","nintendo","switch","ubisoft","connect","ea","app","gift","card"])
  function tokens(s: string): string[] {
    return String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((t) => t.length > 2 && !STOP.has(t))
  }
  function coversAll(titleTokens: string[], candidate: string): boolean {
    const c = String(candidate).toLowerCase()
    return titleTokens.every((t) => c.includes(t))
  }

  for (const p of products as any[]) {
    try {
      const meta = p.metadata || {}
      let kp: KinguinProductRow | undefined
      if (meta.kinguin_id) kp = byKinguinId.get(String(meta.kinguin_id))
      if (!kp && p.id) kp = byMedusaId.get(p.id)
      if (!kp) {
        const byTitle = byName.get(String(p.title).trim().toLowerCase())
        if (byTitle) kp = byTitle
      }

      let image: string | null = null
      if (kp) {
        image = bestImage(kp)
        // Depolanmis gorsel yoksa detay API'den dene (cover.thumbnail icerir)
        if (!image) {
          const remote = await kinguin.getProductInfo(kp.kinguin_id).catch(() => null)
          if (remote?.images) {
            await kinguin.upsertLocalProduct(remote)
            const refreshed = await kinguin.listKinguinProducts({ kinguin_id: kp.kinguin_id })
            if (refreshed?.[0]) {
              kp = refreshed[0]
              image = bestImage(kp)
            }
          }
        }
      } else if (meta.provider !== 'kinguin' || !meta.kinguin_id) {
        // Eski import: isimle ES API aramasi yap, en iyi adayi kalici esle
        const titleTokens = tokens(p.title)
        if (titleTokens.length >= 1) {
          const query = titleTokens.slice(0, 5).join(" ")
          const searchRes = await kinguin
            .listProducts({ name: query, limit: 10 })
            .catch(() => null)
          const candidate = (searchRes?.results || []).find(
            (r: any) => Number(r.qty) > 0 && coversAll(titleTokens, r.name)
          )
          if (candidate) {
            await kinguin.upsertLocalProduct(candidate)
            const refreshed = await kinguin.listKinguinProducts({ kinguin_id: candidate.kinguinId })
            kp = refreshed?.[0]
            image = kp ? bestImage(kp) : null
          }
        }
      }

      if (!kp || !image) {
        skipped++
        continue
      }

      const newMeta = {
        ...(meta || {}),
        provider: 'kinguin',
        kinguin_id: kp.kinguin_id,
        provider_product_id: kp.product_id,
        provider_image: image,
        platform: kp.platform || meta.platform || 'PC',
        region: meta.region || kp.region_limitations || 'GLOBAL',
        original_price: meta.original_price ?? Number(kp.price) / 100,
        provider_currency: kp.currency || 'eur',
      }
      await productModule.updateProducts(p.id, {
        thumbnail: image,
        images: [{ url: image }],
        metadata: newMeta,
      })
      if (!kp.medusa_product_id) {
        await kinguin.updateKinguinProducts({
          id: kp.id,
          medusa_product_id: p.id,
          medusa_variant_id: kp.medusa_variant_id ?? null,
        } as any)
      }
      updated++
      // ES API rate limit — aramalar arasi kisa bekleme
      await new Promise((r) => setTimeout(r, 120))
    } catch (e: any) {
      failed++
      if (details.length < 10) details.push(`${p.id}: ${e?.message}`)
    }
  }

  logger.info(`[kinguin-sync] gorsel backfill: updated=${updated} skipped=${skipped} failed=${failed}`)
  return { updated, skipped, failed, details }
}
