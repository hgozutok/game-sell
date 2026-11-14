/**
 * Kinguin fulfillment workflow'u.
 *
 * Akis (compensation'li):
 *   1. prepare: siparis satirlarini Kinguin kataloguna esle, bakiye/stok/zarar guard'lari
 *   2. envanterden key cek (varsa) — compensation ile geri alinabilir
 *   3. eksik adetler icin Kinguin siparisi (readonly guard + idempotency)
 *   4. key'ler hazirsa teslimat; degilse sync-order-status job'u tamamlar
 *
 * Siparis metadata fulfillment_state akisi:
 *   pending_fulfillment -> provider_order_placed -> delivered
 *   awaiting_approval / awaiting_provider_mode (manuel kuyruk)
 *   retrying -> failed (max denemeden sonra)
 */
import {
  createWorkflow,
  WorkflowResponse,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import { encryptKeys, decryptKeys } from "../utils/key-crypto"
import { sendTemplateEmail, buildTableHtml, escapeHtmlValue } from "../utils/email"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

interface FulfillKinguinOrderInput {
  orderId: string
  customerId?: string
  email?: string
  /** Manuel onay ile tetiklendiyse admin id */
  approvedBy?: string
}

interface PreparedLine {
  productId: string
  variantId?: string
  lineItemId: string
  quantity: number
  kinguinRowId?: string
  kinguinId?: string
  providerProductId?: string
  title: string
  unitPriceUsdMinor: number
  costUsdMinor: number
}

const GUARD_CODES = {
  BALANCE: "BALANCE",
  STOCK: "STOCK",
  NEGATIVE_MARGIN: "NEGATIVE_MARGIN",
  READONLY: "READONLY",
  NO_PROVIDER_LINK: "NO_PROVIDER_LINK",
} as const

class GuardError extends Error {
  code: string
  details?: any
  constructor(code: string, message: string, details?: any) {
    super(message)
    this.code = code
    this.details = details
  }
}

async function markFulfillmentState(
  container: any,
  orderId: string,
  state: string,
  extra: Record<string, any> = {}
) {
  const orderModule = container.resolve("order") as any
  const order = await orderModule.retrieveOrder(orderId).catch(() => null)
  if (!order) return
  await orderModule.updateOrders([
    {
      id: orderId,
      metadata: {
        ...(order.metadata || {}),
        fulfillment_state: state,
        fulfillment_updated_at: new Date().toISOString(),
        ...extra,
      },
    },
  ])
}

// ===================== 1) Hazirlik + guard'lar =====================

const prepareFulfillmentStep = createStep(
  "prepare-kinguin-fulfillment",
  async (input: FulfillKinguinOrderInput, { container }) => {
    const orderModule = container.resolve("order") as any
    const kinguin = container.resolve("kinguin") as any
    const keyInventory = container.resolve("keyInventory") as any
    const logger = container.resolve("logger") as any

    const order = await orderModule.retrieveOrder(input.orderId, {
      relations: ["items"],
    })

    const settings = await kinguin.getSettings()

    // --- Bakiye guard (sadece live modda ve gercek alici varken) ---
    let balance = 0
    try {
      balance = (await kinguin.getBalance()).balance
    } catch {
      logger.warn("[fulfill-kinguin] bakiye sorgulanamadi")
    }
    const needsProviderOrder = settings.order_mode === "live"
    if (needsProviderOrder && balance < (settings.min_balance ?? 0)) {
      await markFulfillmentState(container, input.orderId, "failed", {
        fulfillment_error: `Kinguin bakiyesi dusuk: ${balance} EUR (min ${settings.min_balance})`,
      })
      throw new GuardError(
        GUARD_CODES.BALANCE,
        `Kinguin bakiyesi dusuk: ${balance} EUR < min ${settings.min_balance}`
      )
    }

    // --- Satirlari katalogla esle ---
    const lines: PreparedLine[] = []
    for (const item of order.items || []) {
      const productId = item.product_id ?? item.variant?.product_id
      const variantId = item.variant_id
      const rows =
        (variantId
          ? await kinguin.listKinguinProducts({ medusa_variant_id: variantId })
          : []) ||
        []
      let kp = rows[0]
      if (!kp && productId) {
        const byProduct =
          (await kinguin.listKinguinProducts({ medusa_product_id: productId })) || []
        kp = byProduct[0]
      }

      const unitPriceUsdMinor = Math.round(Number(item.unit_price ?? 0))
      const costUsdMinor = kp ? Number(kp.price) : 0 // minor, provider currency
      const title = item.title || "Urun"

      if (!kp) {
        logger.warn(`[fulfill-kinguin] ${title}: kinguin katalog eslesmesi yok`)
        lines.push({
          productId,
          variantId,
          lineItemId: item.id,
          quantity: item.quantity,
          title,
          unitPriceUsdMinor,
          costUsdMinor: 0,
        })
        continue
      }

      if (Number(kp.qty) <= 0) {
        await markFulfillmentState(container, input.orderId, "failed", {
          fulfillment_error: `Stok yok: ${kp.name}`,
        })
        throw new GuardError(GUARD_CODES.STOCK, `Kinguin stok yok: ${kp.name}`)
      }

      // Zarar guard: satis < maliyet*(1+minProfitPct) ise manuel kuyruga
      if (settings.stop_on_negative_margin !== false && costUsdMinor > 0) {
        const minSell = Math.round(costUsdMinor * (1 + (settings.min_profit_pct ?? 0) / 100))
        if (unitPriceUsdMinor > 0 && unitPriceUsdMinor < minSell) {
          await markFulfillmentState(container, input.orderId, "awaiting_approval", {
            fulfillment_error: `Zarar riski: satis ${unitPriceUsdMinor} < maliyet ${minSell} (minor USD)`,
          })
          throw new GuardError(
            GUARD_CODES.NEGATIVE_MARGIN,
            `${title}: satis fiyati maliyetin altinda`
          )
        }
      }

      lines.push({
        productId,
        variantId,
        lineItemId: item.id,
        quantity: item.quantity,
        kinguinRowId: kp.id,
        kinguinId: kp.kinguin_id,
        providerProductId: kp.product_id ?? undefined,
        title,
        unitPriceUsdMinor,
        costUsdMinor,
      })
    }

    const providerLinked = lines.filter((l) => l.providerProductId)
    if (providerLinked.length === 0 && needsProviderOrder) {
      // Hicbir satir Kinguin'e bagli degil — envanter key'i olmadan teslim edilemez
      await markFulfillmentState(container, input.orderId, "failed", {
        fulfillment_error: "Urunler Kinguin kataloguna bagli degil",
      })
      throw new GuardError(GUARD_CODES.NO_PROVIDER_LINK, "Provider baglantisi yok")
    }

    return new StepResponse(
      { orderId: input.orderId, customerId: input.customerId, email: input.email, lines },
      { orderId: input.orderId, lineIds: lines.map((l) => l.lineItemId) }
    )
  },
  // Compensation: fulfillment_state'i sifirla (yeniden denenebilir)
  async (compensateInput: { orderId: string; lineIds: string[] }, { container }) => {
    await markFulfillmentState(container, compensateInput.orderId, "pending_fulfillment")
  }
)

// ===================== 2) Envanterden key =====================

const fetchInventoryKeysStep = createStep(
  "fetch-inventory-keys",
  async (
    input: { orderId: string; customerId?: string; lines: PreparedLine[] },
    { container }
  ) => {
    const keyInventory = container.resolve("keyInventory") as any
    const fetchedKeys: any[] = []

    for (const line of input.lines) {
      let need = line.quantity
      while (need > 0) {
        const key = await keyInventory.getAvailableKey(line.productId, line.variantId)
        if (!key) break
        const assigned = await keyInventory.assignKeyToOrder(
          key.id,
          input.orderId,
          input.customerId ?? null
        )
        fetchedKeys.push({ ...assigned, lineItemId: line.lineItemId })
        need--
      }
    }

    return new StepResponse(
      { keys: fetchedKeys },
      { keyIds: fetchedKeys.map((k) => k.id) }
    )
  },
  // Compensation: atanan keyleri geri ac
  async (compensateInput: { keyIds: string[] }, { container }) => {
    const keyInventory = container.resolve("keyInventory") as any
    for (const keyId of compensateInput.keyIds) {
      await keyInventory.updateDigitalKeys([
        {
          id: keyId,
          status: "available",
          order_id: null,
          customer_id: null,
          assigned_at: null,
        },
      ])
    }
  }
)

// ===================== 3) Kinguin siparisi =====================

const placeKinguinOrderStep = createStep(
  "place-kinguin-order",
  async (
    input: {
      orderId: string
      customerId?: string
      lines: PreparedLine[]
      inventoryKeys: any[]
    },
    { container }
  ) => {
    const kinguin = container.resolve("kinguin") as any
    const logger = container.resolve("logger") as any

    // Envanter karsilanamayan adetler
    const missing = input.lines
      .map((line) => {
        const got = input.inventoryKeys.filter(
          (k: any) => k.lineItemId === line.lineItemId
        ).length
        return { line, qty: line.quantity - got }
      })
      .filter((m) => m.qty > 0 && m.line.providerProductId)

    if (missing.length === 0) {
      return new StepResponse({ kinguinOrderRow: null, purchasedKeys: [] }, null)
    }

    // Idempotency: ayni medusa siparisine ait kinguin_order varsa yeniden olusturma
    const existingRow = await kinguin.getOrderByMedusaOrder(input.orderId)
    if (existingRow && existingRow.status !== "canceled") {
      logger.info(
        `[fulfill-kinguin] ${input.orderId}: mevcut Kinguin siparisi ${existingRow.order_id} kullaniliyor`
      )
      return new StepResponse(
        { kinguinOrderRow: existingRow, purchasedKeys: [] },
        { kinguinOrderId: existingRow.order_id, createdNew: false }
      )
    }

    const settings = await kinguin.getSettings()
    if (settings.order_mode !== "live") {
      // PARA GUVENLIGI: readonly modda siparis olusturulmaz, manuel kuyruga duser.
      await markFulfillmentState(container, input.orderId, "awaiting_provider_mode", {
        fulfillment_error:
          "Kinguin order mode 'readonly' — canli siparis icin admin onayi gerekli",
      })
      throw new GuardError(
        GUARD_CODES.READONLY,
        "Kinguin siparisi readonly modda olusturulamaz"
      )
    }

    const items = missing.map((m) => ({
      productId: m.line.providerProductId!,
      qty: m.qty,
      // Kinguin'e saglayici para biriminde (eur) fiyat gonderilir
      price: Number((m.line.costUsdMinor / 100).toFixed(2)),
    }))

    // ESA guide §8: siparis basina 1-10 kalem, normal satislarda adet 1-9
    if (items.length < 1 || items.length > 10) {
      await markFulfillmentState(container, input.orderId, "awaiting_approval", {
        fulfillment_error: `Kinguin siparis limiti: siparis basina 1-10 kalem olmali (istek: ${items.length}) — bolunmus gonderim gerekli`,
      })
      throw new GuardError(
        "ORDER_LIMIT",
        `Kinguin siparis limiti asildi: ${items.length} kalem`
      )
    }
    for (const item of items) {
      if (item.qty < 1 || item.qty > 9) {
        await markFulfillmentState(container, input.orderId, "awaiting_approval", {
          fulfillment_error: `Kinguin adet limiti: normal satislarda adet 1-9 (istek: qty=${item.qty})`,
        })
        throw new GuardError("ORDER_LIMIT", `Kinguin adet limiti: qty=${item.qty}`)
      }
    }

    const orderRow = await kinguin.createOrder(items, input.orderId)
    await markFulfillmentState(container, input.orderId, "provider_order_placed", {
      kinguin_order_id: orderRow.order_id,
    })

    return new StepResponse(
      { kinguinOrderRow: orderRow, purchasedKeys: [] },
      { kinguinOrderId: orderRow.order_id, createdNew: true }
    )
  },
  // Compensation: siparis yaratildiysa failed isaretle (manuel inceleme — otomatik iptal yok)
  async (
    compensateInput: { kinguinOrderId?: string; createdNew?: boolean } | null,
    { container }
  ) => {
    if (!compensateInput?.createdNew || !compensateInput.kinguinOrderId) return
    const kinguin = container.resolve("kinguin") as any
    await kinguin
      .updateLocalOrderStatus(compensateInput.kinguinOrderId, {
        status: "failed",
        error: "workflow compensation — manuel inceleme gerekli",
      })
      .catch(() => null)
  }
)

// ===================== 4) Key bekle (hizli poll) =====================

const collectProviderKeysStep = createStep(
  "collect-provider-keys",
  async (
    input: { orderId: string; kinguinOrderRow: any },
    { container }
  ) => {
    const kinguin = container.resolve("kinguin") as any
    const keyInventory = container.resolve("keyInventory") as any

    if (!input.kinguinOrderRow) {
      return new StepResponse({ keys: [], pending: false }, null)
    }

    // Hizli 2 deneme; hala yoksa sync-order-status job'u tamamlar (2 dk)
    let keys: any[] = []
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        keys = await kinguin.getOrderKeys(input.kinguinOrderRow.order_id)
        if (keys.length > 0) break
      } catch {
        /* key henuz hazir degil */
      }
      await new Promise((r) => setTimeout(r, 4000))
    }

    if (keys.length === 0) {
      await kinguin.updateLocalOrderStatus(input.kinguinOrderRow.order_id, {
        status: "processing",
      })
      return new StepResponse({ keys: [], pending: true }, null)
    }

    // Sifreli sakla
    const encrypted = encryptKeys(keys)
    await kinguin.updateLocalOrderStatus(input.kinguinOrderRow.order_id, {
      status: "completed",
      keys_encrypted: JSON.parse(encryptKeys(keys)),
      keys_delivered_at: new Date(),
    })

    return new StepResponse({ keys, pending: false }, null)
  }
)

// ===================== 5) Teslimat =====================

export interface DeliverInput {
  orderId: string
  customerId?: string
  email?: string
  keys: Array<{
    id: string
    serial: string
    type: string
    name?: string
    productId?: string
    lineItemId?: string
    product_id?: string
    variant_id?: string
    platform?: string
    region?: string
    provider: "kinguin" | "inventory"
    inventoryKeyId?: string
  }>
}

const deliverKeysStep = createStep(
  "deliver-kinguin-keys",
  async (input: DeliverInput | null, { container }) => {
    if (!input || !input.keys || input.keys.length === 0) {
      return new StepResponse({ delivered: 0 }, null)
    }
    const keyInventory = container.resolve("keyInventory") as any
    const orderModule = container.resolve("order") as any
    const logger = container.resolve("logger") as any

    // Provider key'lerini envantere 'delivered' olarak kaydet (hesap sayfasi okur)
    for (const k of input.keys) {
      if (k.provider === "kinguin") {
        await keyInventory.createDigitalKeys([
          {
            key_code: k.serial,
            product_id: k.product_id ?? k.productId ?? input.orderId,
            variant_id: k.variant_id ?? null,
            provider: "kinguin",
            sku: String(k.id),
            status: "delivered",
            order_id: input.orderId,
            customer_id: input.customerId ?? null,
            assigned_at: new Date(),
            delivered_at: new Date(),
            platform: k.platform ?? null,
            region: k.region ?? null,
            metadata: { kinguin_key_id: String(k.id), key_type: k.type },
          },
        ])
      }
    }

    // E-posta — admin panel SMTP ayarlariyla gonderilir; hata akisi bozmaz.
    try {
      const order = await orderModule.retrieveOrder(input.orderId, { relations: ["items"] })
      const to = input.email || order?.email
      if (to) {
        const keysHtml = buildTableHtml(
          (input.keys || []).map((k: any) => ({
            title: escapeHtmlValue(k.name || k.product_id || "Dijital anahtar"),
            code: `<code style="font-family:monospace;background:#f3f4f6;padding:3px 7px;border-radius:4px;font-size:13px;">${escapeHtmlValue(
              k.serial || ""
            )}</code>`,
          })),
          [
            { key: "title", label: "Ürün" },
            { key: "code", label: "Anahtar" },
          ]
        )

        await sendTemplateEmail(container, {
          to,
          templateKey: "order-digital-keys",
          data: {
            customer_name:
              order?.billing_address?.first_name ||
              String(to).split("@")[0] ||
              "Değerli Müşteri",
            order_number: order?.display_id ? String(order.display_id) : input.orderId,
            keys_html: keysHtml,
          },
        })
      }
    } catch (e: any) {
      logger.warn(`[fulfill-kinguin] e-posta hatasi (akis suruyor): ${e?.message}`)
    }

    // Siparisi fulfilled + delivered isaretle
    try {
      const order = await orderModule.retrieveOrder(input.orderId).catch(() => null)
      await orderModule.updateOrders([
        {
          id: input.orderId,
          metadata: {
            ...(order?.metadata || {}),
            fulfillment_state: "delivered",
            digital_fulfilled: true,
            digital_fulfilled_at: new Date().toISOString(),
            fulfillment_error: null,
          },
        },
      ])
    } catch (e: any) {
      logger.warn(`[fulfill-kinguin] siparis guncelleme hatasi: ${e?.message}`)
    }

    return new StepResponse({ delivered: input.keys.length }, { orderId: input.orderId })
  },
  async (compensateInput: { orderId: string } | null, { container }) => {
    if (!compensateInput) return
    await markFulfillmentState(container, compensateInput.orderId, "retrying", {
      fulfillment_error: "teslimat compensation",
    })
  }
)

// ===================== Workflow'lar =====================

export const fulfillKinguinOrderWorkflow = createWorkflow(
  "fulfill-kinguin-order",
  (input: FulfillKinguinOrderInput) => {
    const prepared = prepareFulfillmentStep(input)

    const inventoryResult = transform({ prepared }, (data) => ({
      orderId: data.prepared.orderId,
      customerId: data.prepared.customerId,
      lines: data.prepared.lines,
    }))

    const invKeys = fetchInventoryKeysStep(
      transform({ prepared }, (data) => ({
        orderId: data.prepared.orderId,
        customerId: data.prepared.customerId,
        lines: data.prepared.lines,
      }))
    )

    const placed = placeKinguinOrderStep(
      transform({ prepared, invKeys }, (data) => ({
        orderId: data.prepared.orderId,
        customerId: data.prepared.customerId,
        lines: data.prepared.lines,
        inventoryKeys: data.invKeys.keys,
      }))
    )

    const collected = collectProviderKeysStep(
      transform({ placed }, (data) => ({
        orderId: data.placed.kinguinOrderRow?.orderId ?? null,
        kinguinOrderRow: data.placed.kinguinOrderRow,
      }))
    )

    const deliverInput = transform(
      { prepared, invKeys, placed, collected },
      (data) => {
        const keys = [
          ...data.invKeys.keys.map((k: any) => ({
            id: k.id,
            serial: k.key_code,
            type: "text/plain",
            name: k.platform ?? undefined,
            product_id: k.product_id,
            variant_id: k.variant_id,
            platform: k.platform ?? undefined,
            region: k.region ?? undefined,
            provider: "inventory" as const,
          })),
          ...(data.collected.keys || []).map((k: any) => ({
            id: String(k.id),
            serial: k.serial,
            type: k.type || "text/plain",
            name: k.name ?? undefined,
            productId: k.productId,
            provider: "kinguin" as const,
          })),
        ]
        return {
          orderId: data.prepared.orderId,
          customerId: data.prepared.customerId,
          email: data.prepared.email,
          keys,
          hasPending: data.collected.pending,
        }
      }
    )

    // Key'ler tamamen hazirsa teslim et; degilse sync-order-status job'u
    // deliver-kinguin-keys ile tamamlar.
    when(
      deliverInput,
      (data) => !data.hasPending && data.keys.length > 0
    ).then(() => deliverKeysStep(deliverInput))

    return new WorkflowResponse({
      deliveredKeys: deliverInput.keys,
      hasPending: deliverInput.hasPending,
    })
  }
)

/**
 * Bagimsiz teslimat workflow'u — webhook/sync job'u Kinguin key'leri
 * kinguin_order'a dustugunde cagirir. Key'leri sifreli kayittan acar.
 */
const loadKeysFromOrderStep = createStep(
  "load-keys-from-kinguin-order",
  async (
    input: { orderId: string; customerId?: string; email?: string },
    { container }
  ) => {
    const kinguin = container.resolve("kinguin") as any
    const orderModule = container.resolve("order") as any

    const koRow = await kinguin.getOrderByMedusaOrder(input.orderId)
    if (!koRow || koRow.status !== "completed" || !koRow.keys_encrypted) {
      return new StepResponse({ deliver: null }, { orderId: input.orderId })
    }

    const keys = decryptKeys<any[]>(koRow.keys_encrypted)

    const order = await orderModule.retrieveOrder(input.orderId, {
      relations: ["items"],
    })

    // Eslesen medusa satirlarini bul (kinguinId -> variant SKU KINGUIN-<id>)
    const deliver: DeliverInput = {
      orderId: input.orderId,
      customerId: input.customerId ?? order?.customer_id,
      email: input.email ?? order?.email,
      keys: keys.map((k: any) => {
        const kinguinId = String(k.kinguinId ?? "")
        const item = (order.items || []).find((i: any) =>
          i.variant?.sku === `KINGUIN-${kinguinId}` ||
          i.variant_sku === `KINGUIN-${kinguinId}`
        )
        return {
          id: String(k.id),
          serial: k.serial,
          type: k.type || "text/plain",
          name: k.name ?? item?.title ?? undefined,
          productId: k.productId,
          product_id: item?.product_id ?? item?.variant?.product_id,
          variant_id: item?.variant_id,
          provider: "kinguin" as const,
        }
      }),
    }

    return new StepResponse({ deliver }, { orderId: input.orderId })
  },
  async (compensateInput: { orderId: string }, { container }) => {
    // yeniden teslim denenebilir
  }
)

export const deliverKinguinKeysWorkflow = createWorkflow(
  "deliver-kinguin-keys",
  (input: { orderId: string; customerId?: string; email?: string }) => {
    const loaded = loadKeysFromOrderStep(input)
    const deliver = transform({ loaded }, (data) => data.loaded.deliver)
    deliverKeysStep(deliver)
    return new WorkflowResponse({ done: true })
  }
)
