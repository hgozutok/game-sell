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

// Ayni Node surecinde calisan synclari aninda durdurmak icin log id kayitlari.
// DB'deki "canceled" durumu baska surecler (worker) icin de gecerlidir.
const canceledSyncs = new Set<string>()

export function markKinguinSyncCanceled(logId: string): void {
  if (logId) canceledSyncs.add(logId)
}

const CANCEL_CHECK_INTERVAL_MS = 2000

/** DB'yi her kontrolde yormadan iptal sinyali okur. */
function createCancelWatcher(kinguin: AnyService, logId: string) {
  let lastDbCheck = 0
  return async function isCanceled(force = false): Promise<boolean> {
    if (canceledSyncs.has(logId)) return true
    if (!force && Date.now() - lastDbCheck < CANCEL_CHECK_INTERVAL_MS) return false
    lastDbCheck = Date.now()
    const rows = await kinguin.listSyncLogs({ id: logId }).catch(() => [])
    if (rows?.[0]?.status === "canceled") {
      canceledSyncs.add(logId)
      return true
    }
    return false
  }
}

/** Ilerleme + heartbeat; en fazla 3 saniyede bir DB yazar. */
function createProgressWriter(kinguin: AnyService, logId: string) {
  let last = 0
  return async function writeProgress(processed: number, total: number, force = false) {
    const now = Date.now()
    if (!force && now - last < 3000) return
    last = now
    await kinguin
      .touchSyncLog(logId, {
        progress_processed: Math.max(0, Math.round(processed)),
        progress_total: Math.max(0, Math.round(total)),
      })
      .catch(() => undefined)
  }
}

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
  status: "completed" | "failed" | "skipped" | "canceled"
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

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    // slice sonrasi sonda '-' kalabilir — Medusa handle validasyonu reddediyor
    .replace(/-+$/g, "")
}

/**
 * Kinguin aciklamasini Medusa product.description icin temizler: HTML
 * etiketlerini doker, beyaz alanlari sadelestirir, 4000 karakterde keser.
 */
export function cleanKinguinDescription(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined
  const clean = String(raw)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
  if (!clean) return undefined
  return clean.length > 4000 ? `${clean.slice(0, 3997)}...` : clean
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

// Genres live in product categories (many-to-many); collections are many-to-one
// so platform + genre ayni anda tutulamaz. Kategori yoksa yaratilir.
async function getOrCreateGenreCategoryIds(
  productModule: AnyService,
  genres: string[] | null | undefined
): Promise<string[]> {
  const ids: string[] = []
  for (const raw of genres || []) {
    const name = String(raw).trim()
    if (!name) continue
    try {
      const existing = await productModule.listProductCategories({ name })
      if (existing?.length) {
        ids.push(existing[0].id)
        continue
      }
      const created = await productModule.createProductCategories({
        name,
        is_active: true,
        is_internal: false,
      })
      ids.push(created.id)
    } catch {
      // kategori basarisiz olurursa urun listeleme akisini bloklamayalim
    }
  }
  return [...new Set(ids)]
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
  const genreCategoryIds = await getOrCreateGenreCategoryIds(productModule, kp.genres)

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
      // updateProducts category_ids'i SET eder; mevcut kategorilerle birlestirilir
      const current = await productModule
        .listProducts({ id: productId }, { relations: ["categories"], take: 1 })
        .catch(() => [])
      const existingCatIds: string[] = (current?.[0]?.categories || []).map((c: any) => c.id)
      await productModule.updateProducts(productId, {
        title: kp.name.substring(0, 255),
        description: cleanKinguinDescription(kp.description),
        thumbnail,
        images: [{ url: thumbnail }],
        status: opts.publish === false ? "draft" : "published",
        // Medusa v2'de urun->collection many-to-one; alan adi tekil (collection_ids yok sayilir)
        collection_id: platformCollectionId || undefined,
        category_ids: [...new Set([...existingCatIds, ...genreCategoryIds])],
        metadata,
      })
    } else {
      const created = await productModule.createProducts({
        title: kp.name.substring(0, 255),
        description: cleanKinguinDescription(kp.description),
        handle,
        status: opts.publish === false ? "draft" : "published",
        thumbnail,
        images: [{ url: thumbnail }],
        // Medusa v2'de urun->collection many-to-one; alan adi tekil (collection_ids yok sayilir)
        collection_id: platformCollectionId || undefined,
        category_ids: genreCategoryIds.length ? genreCategoryIds : undefined,
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
  const isCanceled = createCancelWatcher(kinguin, log.id)
  const writeProgress = createProgressWriter(kinguin, log.id)
  let canceled = false

  try {
    // 1) Katalog senkronu — yerel kinguin_product tablosu
    const lastSync = opts.updatedSince ?? (settings.last_sync_at ? new Date(settings.last_sync_at) : undefined)
    let total = 0
    let added = 0
    let updated = 0
    let failed = 0
    let expectedTotal = 0

    // Ilerleme cubugu icin ust sinir (API toplam kayit sayisi) — basarisizsa 0 kalir.
    try {
      const probe = await kinguin.listProducts({
        limit: 1,
        sortBy: "updatedAt",
        sortType: "desc",
        ...(lastSync ? { updatedSince: lastSync.toISOString() } : {}),
      })
      expectedTotal = Number(probe?.itemCount || 0)
    } catch {
      expectedTotal = 0
    }

    const iterator = kinguin.iterateProducts(
      lastSync
        ? { updatedSince: lastSync.toISOString(), sortBy: "updatedAt", sortType: "desc" }
        : { sortBy: "updatedAt", sortType: "desc" },
      opts.maxPages ?? 1000
    )

    for await (const product of iterator) {
      if (await isCanceled()) {
        canceled = true
        break
      }
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
      await writeProgress(total, expectedTotal)
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
    let listedProcessed = 0
    let listedTotal = 0

    if (!canceled && (settings.sync_prices || settings.sync_stock)) {
      const listed = await kinguin.listKinguinProducts({ store_listed: true })
      const totalWithListed = total + listed.length
      listedTotal = listed.length
      let processed = 0
      for (const kp of listed as KinguinProductRow[]) {
        if (await isCanceled()) {
          canceled = true
          break
        }
        processed++
        listedProcessed = processed
        await writeProgress(total + processed, totalWithListed)
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

    if (canceled) {
      await kinguin.finishSyncLog(log.id, {
        status: "canceled",
        items_total: total,
        items_added: added,
        items_updated: updated,
        items_failed: failed,
        pending_approvals: pendingApprovals,
        progress_processed: total + listedProcessed,
        progress_total: Math.max(expectedTotal, total + listedTotal),
        errors: errors.length ? errors : ["admin tarafindan iptal edildi"],
        details: {
          repriced,
          hidden,
          unhidden,
          mode: lastSync ? "incremental" : "full",
          cancel_reason: "admin",
        },
      })
      summary.status = "canceled"
      summary.reason = "admin tarafindan iptal edildi"
      summary.logId = log.id
      return summary
    }

    await kinguin.finishSyncLog(log.id, {
      status: "completed",
      items_total: total,
      items_added: added,
      items_updated: updated,
      items_failed: failed,
      pending_approvals: pendingApprovals,
      progress_processed: total + listedTotal,
      progress_total: Math.max(expectedTotal || 0, total + listedTotal),
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
 * Magaza urunleri ile Kinguin katalog kayitlarini hizalar.
 *
 * Kural: yalnizca Medusa'da "published" olan urunler listede sayilir.
 * Taslak/silinmis urunlerin Kinguin kaydi store_listed=false yapilir; katalog
 * kaydi silinmez. Boylece dashboard sayisi ile Kinguin listesi ayni gercegi anlatir.
 */
export interface ReconcileSummary {
  products: number
  published: number
  catalog: number
  listed_before: number
  listed_after: number
  linked: number
  relisted: number
  unlisted: number
  linked_now: number
  // Baslik eslesmesiyle baglanan kayitlar (metadata.kinguin_id olmayan eski urunler)
  linked_by_title: number
  unmatched: number
}

export async function reconcileKinguinListings(container: any): Promise<ReconcileSummary> {
  const { kinguin, productModule, logger } = await getServices(container)

  async function countKinguin(filters: Record<string, any> = {}): Promise<number> {
    try {
      if (typeof kinguin.listAndCountKinguinProducts === "function") {
        const [, count] = await kinguin.listAndCountKinguinProducts(filters, { take: 1 })
        return Number(count || 0)
      }
    } catch {
      // asagidaki fallback
    }
    const rows = await kinguin.listKinguinProducts(filters)
    return rows.length
  }

  // 1) Magaza urunleri (sayfali)
  const products: any[] = []
  let skip = 0
  while (true) {
    const batch = await productModule.listProducts({}, { take: 200, skip })
    products.push(...batch)
    if (batch.length < 200) break
    skip += 200
    if (skip > 100000) break
  }
  const byId = new Map<string, any>(products.map((p: any) => [p.id, p]))
  const byKinguinId = new Map<string, any>()
  for (const p of products) {
    const kid = (p.metadata || {}).kinguin_id
    if (kid !== undefined && kid !== null && String(kid)) byKinguinId.set(String(kid), p)
  }
  const isPublished = (p: any) => !!p && p.status === "published" && !p.deleted_at

  const listedBefore = await countKinguin({ store_listed: true })

  // 2) Medusa urunune bagli kayitlar + metadata.kinguin_id ile eslesenler
  const linkedRows = await kinguin.listKinguinProducts({ medusa_product_id: { $ne: null } })
  const kinguinIds = [...byKinguinId.keys()]
  const matchedRows: any[] = [...linkedRows]
  for (let i = 0; i < kinguinIds.length; i += 100) {
    const chunk = kinguinIds.slice(i, i + 100)
    const rows = await kinguin.listKinguinProducts({ kinguin_id: { $in: chunk } })
    matchedRows.push(...rows)
  }

  let relisted = 0
  let unlisted = 0
  let linkedNow = 0
  let linkedByTitle = 0
  const handled = new Set<string>()
  const linkedProductIds = new Set<string>()

  for (const kp of matchedRows) {
    if (!kp || handled.has(kp.id)) continue
    handled.add(kp.id)

    const product =
      (kp.medusa_product_id ? byId.get(kp.medusa_product_id) : undefined) ||
      byKinguinId.get(String(kp.kinguin_id)) ||
      undefined
    const shouldList = isPublished(product)
    const patch: Record<string, any> = {}

    if (shouldList && product) {
      if (kp.medusa_product_id !== product.id) {
        patch.medusa_product_id = product.id
        linkedNow++
      }
      if (!kp.store_listed) {
        patch.store_listed = true
        relisted++
      }
      linkedProductIds.add(product.id)
    } else if (kp.store_listed) {
      patch.store_listed = false
      unlisted++
    }

    if (Object.keys(patch).length > 0) {
      await kinguin.updateKinguinProducts({ id: kp.id, ...patch } as any)
    }
  }

  // 2b) Baslik eslesmesi — metadata.kinguin_id tasimayan eski urunler.
  // Katalogda ayni baslikta TEK kayit varsa ve o kayit baska urune bagli degilse baglanir.
  // Ayni isimde birden fazla katalog kaydi (bolge varyantlari) varsa dokunulmaz.
  const normalizeTitle = (value: any) =>
    String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim()

  const titleCandidates = products.filter((p) => !linkedProductIds.has(p.id))
  const productsByTitleKey = new Map<string, any[]>()
  for (const p of titleCandidates) {
    const key = normalizeTitle(p.title)
    if (!key) continue
    const arr = productsByTitleKey.get(key)
    if (arr) arr.push(p)
    else productsByTitleKey.set(key, [p])
  }

  const titles = titleCandidates.map((p) => p.title).filter((t: any) => !!t)
  for (let i = 0; i < titles.length; i += 50) {
    const chunk = titles.slice(i, i + 50)
    let rows: any[] = []
    try {
      rows = await kinguin.listKinguinProducts({ name: { $in: chunk } })
    } catch {
      rows = []
    }

    const rowsByName = new Map<string, any[]>()
    for (const row of rows) {
      const key = normalizeTitle(row?.name)
      const arr = rowsByName.get(key)
      if (arr) arr.push(row)
      else rowsByName.set(key, [row])
    }

    for (const [key, group] of rowsByName.entries()) {
      const prods = productsByTitleKey.get(key) || []
      if (prods.length !== 1 || group.length !== 1) continue
      const product = prods[0]
      const kp = group[0]
      if (kp.medusa_product_id && kp.medusa_product_id !== product.id) continue
      if (linkedProductIds.has(product.id)) continue

      const patch: Record<string, any> = {}
      if (kp.medusa_product_id !== product.id) patch.medusa_product_id = product.id
      if (isPublished(product) && !kp.store_listed) patch.store_listed = true
      if (Object.keys(patch).length === 0) continue

      await kinguin.updateKinguinProducts({ id: kp.id, ...patch } as any)
      linkedProductIds.add(product.id)
      if (patch.medusa_product_id) {
        linkedNow++
        linkedByTitle++
      }
      if (patch.store_listed) relisted++
    }
  }

  // 3) metadata.kinguin_id var ama katalog kaydi yok
  let unmatched = 0
  const matchedKinguinIds = new Set(matchedRows.map((r: any) => String(r.kinguin_id)))
  for (const kid of byKinguinId.keys()) {
    if (!matchedKinguinIds.has(kid)) unmatched++
  }

  const listedAfter = await countKinguin({ store_listed: true })
  const linked = await countKinguin({ medusa_product_id: { $ne: null } })
  const catalog = await countKinguin({})
  const published = products.filter(isPublished).length

  const summary: ReconcileSummary = {
    products: products.length,
    published,
    catalog,
    listed_before: listedBefore,
    listed_after: listedAfter,
    linked,
    relisted,
    unlisted,
    linked_now: linkedNow,
    linked_by_title: linkedByTitle,
    unmatched,
  }

  logger.info(`[kinguin-sync] reconcile: ${JSON.stringify(summary)}`)
  return summary
}

/**
 * Sadece fiyat senkronu (hizli) — listelenen urunlerde maliyet degisimini uygular.
 */
export async function syncKinguinPrices(container: any): Promise<SyncSummary> {
  const { kinguin, productModule, logger } = await getServices(container)
  const settings = await kinguin.getSettings()
  const log = await kinguin.startSyncLog("price")
  const isCanceled = createCancelWatcher(kinguin, log.id)
  const writeProgress = createProgressWriter(kinguin, log.id)

  let repriced = 0
  let pendingApprovals = 0
  let failed = 0
  let processed = 0
  let canceled = false
  const errors: string[] = []

  try {
    const listed = await kinguin.listKinguinProducts({ store_listed: true })
    await writeProgress(0, listed.length, true)
    for (const kp of listed as KinguinProductRow[]) {
      if (await isCanceled()) {
        canceled = true
        break
      }
      processed++
      await writeProgress(processed, listed.length)
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

    if (canceled) {
      await kinguin.finishSyncLog(log.id, {
        status: "canceled",
        items_total: listed.length,
        items_updated: repriced,
        items_failed: failed,
        pending_approvals: pendingApprovals,
        progress_processed: processed,
        progress_total: listed.length,
        errors: errors.length ? errors : ["admin tarafindan iptal edildi"],
        details: { cancel_reason: "admin" },
      })
      return {
        status: "canceled",
        itemsTotal: listed.length,
        repriced,
        pendingApprovals,
        failed,
        logId: log.id,
      }
    }

    await kinguin.finishSyncLog(log.id, {
      status: "completed",
      items_total: listed.length,
      items_updated: repriced,
      items_failed: failed,
      pending_approvals: pendingApprovals,
      progress_processed: processed,
      progress_total: listed.length,
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
