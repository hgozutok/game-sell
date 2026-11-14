import { MedusaService } from "@medusajs/framework/utils"
import axios, { AxiosError, AxiosInstance } from "axios"
import crypto from "crypto"

import KinguinProduct from "./models/kinguin-product"
import KinguinOrder from "./models/kinguin-order"
import SyncLog from "./models/sync-log"
import KinguinSettings from "./models/kinguin-settings"
import {
  CreateOrderItem,
  KinguinApiOrder,
  KinguinApiKey,
  KinguinApiOrderProduct,
  KinguinApiProduct,
  KinguinAuthError,
  KinguinError,
  KinguinInsufficientBalanceError,
  KinguinNotFoundError,
  KinguinNoKeysToReturnError,
  KinguinOrderModeError,
  KinguinProductData,
  KinguinProductUnavailableError,
  KinguinRateLimitError,
} from "./types"

const SETTINGS_ID = "settings_default"
const MAX_PAGE_SIZE = 100
const RETRY_DELAYS_MS = [1000, 2000, 4000]

export interface KinguinListParams {
  name?: string
  platform?: string
  genre?: string
  regionId?: number
  kinguinId?: number | string
  productId?: string
  isPreorder?: "yes" | "no"
  withText?: "yes"
  updatedSince?: string
  page?: number
  limit?: number
  sortBy?: "kinguinId" | "updatedAt"
  sortType?: "asc" | "desc"
}

type InjectedDependencies = Record<string, unknown>

class KinguinService extends MedusaService({
  KinguinProduct,
  KinguinOrder,
  SyncLog,
  KinguinSettings,
}) {
  protected client_: AxiosInstance
  protected baseUrl_: string

  constructor(container: InjectedDependencies = {}, options: Record<string, any> = {}) {
    super(container as any, options)

    const apiKey = process.env.KINGUIN_API_KEY
    if (!apiKey) {
      throw new Error("Kinguin API key not configured (KINGUIN_API_KEY)")
    }

    // Production: https://gateway.kinguin.net/esa/api
    // Sandbox:    https://gateway.sandbox.kinguin.net/esa/api
    this.baseUrl_ = (
      process.env.KINGUIN_BASE_URL || "https://gateway.kinguin.net/esa/api"
    ).replace(/\/+$/, "")

    this.client_ = axios.create({
      baseURL: this.baseUrl_,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
    })
  }

  // ===================== HTTP katmani: retry + hata siniflandirma =====================

  private classifyError(err: AxiosError): KinguinError {
    const status = err.response?.status
    const data = err.response?.data as any
    const kind = data?.kind || data?.error || ""

    if (status === 401 || status === 403 || kind === "Authorization") {
      return new KinguinAuthError()
    }
    if (status === 429) {
      const ra = err.response?.headers?.["retry-after"]
      const retryAfterMs = ra ? Number(ra) * 1000 : undefined
      return new KinguinRateLimitError(retryAfterMs)
    }
    if (status === 404) {
      return new KinguinNotFoundError(String(data?.detail || "resource"))
    }
    if (kind === "InsufficientBalance") {
      return new KinguinInsufficientBalanceError(data?.detail)
    }
    if (kind === "ProductUnavailable" || kind === "NoOffers") {
      return new KinguinProductUnavailableError(data?.detail)
    }
    if (kind === "NoKeysToReturn") {
      // ESA guide §14: iade kriterlerine uyan key yok
      return new KinguinNoKeysToReturnError(data?.detail)
    }
    return new KinguinError(
      `Kinguin request failed: ${data?.detail || err.message}`,
      status,
      kind || undefined,
      data
    )
  }

  private async request<T>(
    method: "get" | "post",
    path: string,
    options: { params?: any; body?: any } = {}
  ): Promise<T> {
    let lastErr: KinguinError | null = null

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const res = await this.client_.request<T>({
          method,
          url: path,
          params: options.params,
          data: options.body,
        })
        return res.data
      } catch (e) {
        const err = this.classifyError(e as AxiosError)
        lastErr = err
        const retryable =
          err instanceof KinguinRateLimitError ||
          (err.status !== undefined && err.status >= 500) ||
          // network / timeout hatalari (status yok)
          (err.status === undefined && !(err instanceof KinguinAuthError))

        if (!retryable || attempt === RETRY_DELAYS_MS.length) {
          throw err
        }
        const delay =
          err instanceof KinguinRateLimitError && err.retryAfterMs
            ? err.retryAfterMs
            : RETRY_DELAYS_MS[attempt]
        await new Promise((r) => setTimeout(r, delay))
      }
    }
    throw lastErr ?? new KinguinError("Kinguin request failed")
  }

  // ===================== Katalog =====================

  private mapProduct(raw: KinguinApiProduct): KinguinProductData {
    const images: { cover?: string; screenshots?: string[] } = {}
    // Kapak: url > thumbnail > ilk screenshot — bazi urunlerde url bos string gelir
    const coverCandidate =
      raw.images?.cover?.url ||
      raw.images?.cover?.thumbnail ||
      raw.images?.screenshots?.[0]?.url
    if (coverCandidate) images.cover = coverCandidate
    if (raw.images?.screenshots?.length) {
      images.screenshots = raw.images.screenshots
        .map((s) => s?.url)
        .filter((u): u is string => !!u)
    }
    return {
      kinguinId: String(raw.kinguinId),
      productId: raw.productId ?? null,
      name: raw.name || raw.originalName || "Unknown",
      originalName: raw.originalName ?? null,
      platform: raw.platform ?? null,
      genre: raw.genre ?? null,
      regionId: typeof raw.regionId === "number" ? raw.regionId : null,
      regionLimitations: raw.regionalLimitations ?? null,
      qty: Number(raw.qty ?? raw.totalQty ?? 0),
      textQty: Number(raw.textQty ?? 0),
      price: Number(raw.price ?? 0),
      currency: (process.env.KINGUIN_PROVIDER_CURRENCY || "eur").toLowerCase(),
      images,
      genres: Array.isArray(raw.genres) ? raw.genres : [],
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      isPreorder: !!raw.isPreorder,
      hasText: raw.hasText !== false,
      releaseDate: raw.releaseDate ?? null,
      ageRating:
        raw.ageRating !== undefined && raw.ageRating !== null
          ? Number(raw.ageRating)
          : null,
      raw,
    }
  }

  async listProducts(params: KinguinListParams = {}): Promise<{
    results: KinguinProductData[]
    itemCount: number
    page: number
    limit: number
  }> {
    const page = params.page ?? 1
    const limit = Math.min(params.limit ?? 25, MAX_PAGE_SIZE)

    const data = await this.request<{ results: KinguinApiProduct[]; item_count: number }>(
      "get",
      "/v1/products",
      {
        params: {
          page,
          limit,
          ...(params.name ? { name: params.name } : {}),
          ...(params.platform ? { platform: params.platform } : {}),
          ...(params.genre ? { genre: params.genre } : {}),
          ...(params.regionId ? { regionId: params.regionId } : {}),
          ...(params.kinguinId ? { kinguinId: params.kinguinId } : {}),
          ...(params.productId ? { productId: params.productId } : {}),
          ...(params.isPreorder ? { isPreorder: params.isPreorder } : {}),
          ...(params.withText ? { withText: params.withText } : {}),
          ...(params.updatedSince ? { updatedSince: params.updatedSince } : {}),
          ...(params.sortBy ? { sortBy: params.sortBy } : {}),
          ...(params.sortType ? { sortType: params.sortType } : {}),
        },
      }
    )

    return {
      results: (data.results || []).map((r) => this.mapProduct(r)),
      itemCount: data.item_count ?? 0,
      page,
      limit,
    }
  }

  // Sayfa sayga tum katalogu gezmek icin (sync job kullanir)
  async *iterateProducts(
    params: KinguinListParams = {},
    maxPages = 500
  ): AsyncGenerator<KinguinProductData> {
    let page = params.page ?? 1
    for (let i = 0; i < maxPages; i++) {
      const res = await this.listProducts({ ...params, page, limit: MAX_PAGE_SIZE })
      for (const p of res.results) {
        yield p
      }
      const fetched = page * MAX_PAGE_SIZE
      if (res.results.length === 0 || fetched >= res.itemCount) break
      page++
    }
  }

  async getProduct(kinguinId: string | number): Promise<KinguinProductData> {
    const data = await this.request<KinguinApiProduct>(
      "get",
      `/v1/products/${kinguinId}`
    )
    return this.mapProduct(data)
  }

  async getProductByProductId(productId: string): Promise<KinguinProductData> {
    const data = await this.request<KinguinApiProduct>(
      "get",
      `/v2/products/${productId}`
    )
    return this.mapProduct(data)
  }

  // ===================== Yerel katalog kayitlari =====================

  async upsertLocalProduct(data: KinguinProductData): Promise<any> {
    const existing = await this.listKinguinProducts({ kinguin_id: data.kinguinId })

    // NaN guard: API bazen bozuk releaseDate/ageRating donderir; NaN binding
    // postgres'te "column nan does not exist" hatasina yol acar.
    const parsedRelease = data.releaseDate ? new Date(data.releaseDate) : null
    const releaseDate =
      parsedRelease && Number.isFinite(parsedRelease.getTime()) ? parsedRelease : null
    const ageRating =
      data.ageRating !== null && Number.isFinite(Number(data.ageRating))
        ? Math.round(Number(data.ageRating))
        : null
    const regionId = Number.isFinite(Number(data.regionId))
      ? Number(data.regionId)
      : null

    const payload = {
      kinguin_id: data.kinguinId,
      product_id: data.productId,
      name: data.name,
      original_name: data.originalName,
      platform: data.platform,
      genre: data.genre,
      region_id: regionId,
      region_limitations: data.regionLimitations,
      qty: Number.isFinite(Number(data.qty)) ? Number(data.qty) : 0,
      text_qty: Number.isFinite(Number(data.textQty)) ? Number(data.textQty) : 0,
      // FIYAT MINOR UNIT (kurus) saklanir — API float doner, kolon integer'dir
      price: Math.round(data.price * 100) || 0,
      currency: data.currency,
      images: data.images,
      genres: data.genres,
      tags: data.tags,
      is_preorder: data.isPreorder,
      has_text: data.hasText,
      release_date: releaseDate,
      age_rating: ageRating,
      last_synced_at: new Date(),
      raw_payload: data.raw,
    }

    if (existing.length > 0) {
      const id = existing[0].id
      await this.updateKinguinProducts({ id, ...payload } as any)
      return { ...(existing[0] as any), ...payload }
    }
    return await this.createKinguinProducts(payload as any)
  }

  // ===================== Ayarlar (tekil) =====================

  async getSettings(): Promise<any> {
    const rows = await this.listKinguinSettings()
    if (rows.length > 0) return rows[0]
    // DEFAULT'ler model uzerinde tanimli; ilk okumada olustur.
    const created = await this.createKinguinSettings({
      id: SETTINGS_ID,
      provider_currency: (process.env.KINGUIN_PROVIDER_CURRENCY || "eur").toLowerCase(),
    } as any)
    return created
  }

  async updateSettings(patch: Partial<{
    auto_fulfill_enabled: boolean
    order_mode: "readonly" | "live"
    min_balance: number
    stop_on_negative_margin: boolean
    sync_cron: string
    sync_prices: boolean
    sync_stock: boolean
    sync_info: boolean
    sync_new_products: boolean
    hide_on_zero_stock: boolean
    auto_reprice: boolean
    max_price_change_pct: number
    default_margin_pct: number
    min_profit_pct: number
    rounding_rule: "none" | "ninety_nine"
    provider_currency: string
  }>): Promise<any> {
    await this.getSettings() // var oldugundan emin ol
    const res = await this.updateKinguinSettings({
      id: SETTINGS_ID,
      ...patch,
    } as any)
    return res
  }

  // ===================== Bakiye =====================

  async getBalance(): Promise<{ balance: number; currency: string }> {
    const data = await this.request<{ balance: number }>("get", "/v1/balance")
    return { balance: Number(data.balance), currency: "eur" }
  }

  // ===================== Siparisler =====================

  /**
   * Kinguin siparisi olusturur. PARA HARCAR — readonly modda asla calismaz.
   * Idempotency: medusaOrderId ayni siparis icin tekrar cagrilmaya karsi korur.
   */
  async createOrder(
    items: CreateOrderItem[],
    medusaOrderId?: string,
    idempotencyKey?: string
  ): Promise<any> {
    const settings = await this.getSettings()
    if (settings.order_mode !== "live") {
      throw new KinguinOrderModeError()
    }

    // Idempotency kilidi: bu Medusa siparisine ait kayit varsa yeniden olusturma.
    if (medusaOrderId) {
      const existing = await this.listKinguinOrders({ medusa_order_id: medusaOrderId })
      if (existing.length > 0) {
        return existing[0]
      }
    }

    const body: Record<string, any> = {
      products: items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        price: i.price,
      })),
    }
    // ESA guide: timeout sonrasi kurtarma icin benzersiz orderExternalId sart
    // (409 OrderExternalNotUnique -> asagida ayni referansla siparis bulunur)
    if (medusaOrderId) body.orderExternalId = medusaOrderId

    let data: KinguinApiOrder
    try {
      data = await this.request<KinguinApiOrder>("post", "/v2/order", { body })
    } catch (e: any) {
      // Onceki deneme aslnda siparisi olusturmus olabilir — ayni referansla bul
      if (e?.status !== 409 || !medusaOrderId) throw e
      const remote = await this.request<{ results?: KinguinApiOrder[] }>(
        "get",
        "/v1/order",
        { params: { orderExternalId: medusaOrderId, limit: 1 } }
      ).catch(() => null)
      const first = remote?.results?.[0]
      if (!first) throw e
      data = first
    }

    const order = await this.createKinguinOrders({
      order_id: data.orderId,
      external_id: data.orderExternalId ?? null,
      status: (data.status as any) || "processing",
      total_price: Number(data.totalPrice ?? 0),
      currency: (data.currency || "eur").toLowerCase(),
      products: data.products ?? items,
      medusa_order_id: medusaOrderId ?? null,
      idempotency_key: idempotencyKey ?? crypto.randomUUID(),
    } as any)

    return order
  }

  async getRemoteOrder(orderId: string): Promise<KinguinApiOrder> {
    return await this.request<KinguinApiOrder>("get", `/v1/order/${orderId}`)
  }

  async listRemoteOrders(params: {
    status?: string
    page?: number
    limit?: number
  } = {}): Promise<{ results: KinguinApiOrder[]; itemCount: number }> {
    const data = await this.request<{ results?: KinguinApiOrder[]; item_count?: number }>(
      "get",
      "/v1/order",
      { params: { page: params.page ?? 1, limit: params.limit ?? 25, ...(params.status ? { status: params.status } : {}) } }
    )
    return { results: data.results || [], itemCount: data.item_count ?? 0 }
  }

  async getOrderKeys(orderId: string): Promise<KinguinApiKey[]> {
    const keys: KinguinApiKey[] = []
    let page = 1
    for (;;) {
      const data = await this.request<KinguinApiKey[]>("get", `/v2/order/${orderId}/keys`, {
        params: { page, limit: 100 },
      })
      const arr = Array.isArray(data) ? data : (data as any).results || []
      keys.push(...arr)
      if (arr.length < 100) break
      page++
    }
    return keys
  }

  async returnKeys(orderId: string): Promise<any> {
    return await this.request<any>("post", `/v2/order/${orderId}/keys/return`, { body: {} })
  }

  // Yerel kinguin_order kayitlarini guncelle (workflow/webhook kullanir)
  async updateLocalOrderStatus(orderId: string, patch: Partial<{
    status: "pending" | "processing" | "completed" | "canceled" | "failed" | "refunded"
    keys_encrypted: any
    keys_delivered_at: Date | null
    error: string | null
    retries: number
    total_price: number
    products: any
  }>): Promise<void> {
    const rows = await this.listKinguinOrders({ order_id: orderId })
    if (rows.length === 0) return
    await this.updateKinguinOrders({ id: rows[0].id, ...patch } as any)
  }

  async getOrderByMedusaOrder(medusaOrderId: string): Promise<any | null> {
    const rows = await this.listKinguinOrders({ medusa_order_id: medusaOrderId })
    return rows[0] ?? null
  }

  // ===================== Sync log =====================

  async startSyncLog(type: "full" | "price" | "stock" | "import" | "order_status", details?: any): Promise<any> {
    return await this.createSyncLogs({
      type,
      source: "kinguin",
      status: "running",
      started_at: new Date(),
      details: details ?? null,
    } as any)
  }

  async finishSyncLog(
    logId: string,
    patch: Partial<{
      status: "completed" | "failed"
      items_total: number
      items_added: number
      items_updated: number
      items_failed: number
      pending_approvals: number
      errors: any
      details: any
    }>
  ): Promise<void> {
    await this.updateSyncLogs({
      id: logId,
      ...patch,
      finished_at: new Date(),
    } as any)
  }

  // ===================== Webhook imza =====================

  /** timing-safe imza karsilastirmasi (X-Event-Secret) */
  verifyWebhookSecret(receivedSecret: string | undefined): boolean {
    const expected = process.env.KINGUIN_WEBHOOK_SECRET
    if (!expected || !receivedSecret) return false
    const a = Buffer.from(String(receivedSecret))
    const b = Buffer.from(expected)
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  }

  // ===================== Eski metot adi uyumlulugu =====================
  // Eski import rotalari ve arama ucu bu isimlerle cagriyor; yeni istemciye briolayin.

  async searchProducts(query: string): Promise<KinguinProductData[]> {
    if (!query || query.length < 3) return []
    const res = await this.listProducts({ name: query, limit: 20 })
    return res.results
  }

  async listAllProducts(limit = 100): Promise<KinguinProductData[]> {
    const res = await this.listProducts({ limit, sortBy: "updatedAt", sortType: "desc" })
    return res.results
  }

  async getProductInfo(productId: string): Promise<KinguinProductData | null> {
    try {
      return await this.getProduct(productId)
    } catch {
      try {
        return await this.getProductByProductId(productId)
      } catch {
        return null
      }
    }
  }

  async checkAvailability(productId: string): Promise<boolean> {
    const p = await this.getProductInfo(productId)
    return !!p && p.qty > 0
  }
}

export default KinguinService
