import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"


const SANDBOX_BASE =
  process.env.KINGUIN_SANDBOX_BASE_URL || "https://gateway.sandbox.kinguin.net/esa/api"

function sandboxUrl(path: string) {
  return `${SANDBOX_BASE.replace(/\/+$/, "")}${path}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * POST /admin/order-control/:id/kinguin-sandbox-test
 *
 * Siparişteki ürünleri Kinguin SANDBOX ortamında test siparişi olarak oluşturur
 * ve dönen test anahtarlarını gösterir. Üretim API'sine veya gerçek bakiyeye
 * dokunmaz; yalnızca KINGUIN_SANDBOX_API_KEY ile çalışır.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sandboxKey = process.env.KINGUIN_SANDBOX_API_KEY
  if (!sandboxKey) {
    const keyInventory = req.scope.resolve("keyInventory") as any
    const localKeys = await keyInventory.getKeysByOrder(req.params.id).catch(() => [])
    return res.status(400).json({
      message:
        "Kinguin sandbox anahtarı tanımlı değil. .env dosyasına KINGUIN_SANDBOX_API_KEY ekleyin.",
      code: "SANDBOX_KEY_MISSING",
      local_order_keys: {
        count: (localKeys || []).length,
        statuses: Array.from(new Set((localKeys || []).map((k: any) => k.status))).filter(Boolean),
        providers: Array.from(new Set((localKeys || []).map((k: any) => k.provider))).filter(Boolean),
      },
    })
  }

  try {
    const orderModule = req.scope.resolve(Modules.ORDER) as any
    const productModule = req.scope.resolve(Modules.PRODUCT) as any
    const kinguin = req.scope.resolve("kinguin") as any
    const keyInventory = req.scope.resolve("keyInventory") as any
    const { id: orderId } = req.params

    const order = await orderModule.retrieveOrder(orderId, { relations: ["items"] }).catch(() => null)
    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı" })
    }

    const providerItems: Array<{ productId: string; qty: number; price: number; title?: string }> = []

    for (const item of order.items || []) {
      let rows = await kinguin
        .listKinguinProducts({ medusa_product_id: item.product_id })
        .catch(() => [])
      let kp = rows?.[0]

      if (!kp && item.variant_id) {
        const variant = await productModule
          .retrieveProductVariant(item.variant_id)
          .catch(() => null)
        const sku = String(variant?.sku || item.variant_sku || "")
        if (sku.startsWith("KINGUIN-")) {
          rows = await kinguin
            .listKinguinProducts({ kinguin_id: sku.replace("KINGUIN-", "") })
            .catch(() => [])
          kp = rows?.[0]
        }
      }

      if (!kp?.product_id) continue

      providerItems.push({
        productId: String(kp.product_id),
        qty: Number(item.quantity) || 1,
        // kp.price minor birimde saklanir; ESA euro (major) bekler
        price: Number((Number(kp.price) / 100).toFixed(2)) || 0,
        title: item.title,
      })
    }

    if (providerItems.length === 0) {
      return res.status(400).json({
        message: "Sipariş kalemleri Kinguin kataloğuyla eşleşmiyor; sandbox testi yapılamadı.",
        code: "NO_KINGUIN_MATCH",
      })
    }

    // 1) Sandbox siparişi oluştur
    const createRes = await fetch(sandboxUrl("/v2/order"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Api-Key": sandboxKey,
      },
      body: JSON.stringify({
        products: providerItems.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          price: item.price,
        })),
      }),
    })

    const createBody: any = await createRes.json().catch(() => ({}))
    if (!createRes.ok) {
      return res.status(502).json({
        message:
          createBody?.detail ||
          `Kinguin sandbox siparişi oluşturulamadı (HTTP ${createRes.status})`,
        code: createRes.status === 401 ? "SANDBOX_AUTH" : "SANDBOX_ORDER_FAILED",
        status: createRes.status,
      })
    }

    const sandboxOrderId = String(createBody.orderId || createBody.order_id || "")
    if (!sandboxOrderId) {
      return res.status(502).json({
        message: "Sandbox yanıtında sipariş numarası yok",
        code: "SANDBOX_ORDER_ID_MISSING",
        response: createBody,
      })
    }

    // 2) Anahtarlar hazır olana kadar kısa süre bekle
    let keys: any[] = []
    let remoteStatus = String(createBody.status || "processing")

    for (let attempt = 0; attempt < 6; attempt++) {
      await sleep(2500)

      const statusRes = await fetch(sandboxUrl(`/v1/order/${sandboxOrderId}`), {
        headers: { Accept: "application/json", "X-Api-Key": sandboxKey },
      }).catch(() => null)

      if (statusRes?.ok) {
        const statusBody: any = await statusRes.json().catch(() => ({}))
        remoteStatus = String(statusBody.status || remoteStatus)
      }

      const keysRes = await fetch(
        sandboxUrl(`/v2/order/${sandboxOrderId}/keys?page=1&limit=100`),
        { headers: { Accept: "application/json", "X-Api-Key": sandboxKey } }
      ).catch(() => null)

      if (keysRes?.ok) {
        const keysBody: any = await keysRes.json().catch(() => [])
        keys = Array.isArray(keysBody) ? keysBody : keysBody?.results || []
        if (keys.length > 0) break
      }

      if (["completed", "canceled", "failed"].includes(remoteStatus.toLowerCase())) break
    }

    const localKeys = await keyInventory.getKeysByOrder(orderId).catch(() => [])

    res.json({
      ok: true,
      sandbox_order_id: sandboxOrderId,
      status: remoteStatus,
      provider_items: providerItems,
      test_keys: keys.map((key: any) => ({
        name: key.name || key.product?.name || null,
        serial: key.serial || key.code || null,
        type: key.type || null,
      })),
      test_key_count: keys.length,
      local_order_keys: {
        count: (localKeys || []).length,
        statuses: Array.from(new Set((localKeys || []).map((k: any) => k.status))).filter(Boolean),
        providers: Array.from(new Set((localKeys || []).map((k: any) => k.provider))).filter(Boolean),
      },
      message:
        keys.length > 0
          ? `Sandbox testi başarılı: ${keys.length} test anahtarı alındı.`
          : "Sandbox siparişi oluşturuldu ancak anahtarlar henüz hazır değil. Birkaç dakika sonra tekrar deneyin.",
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Sandbox testi başarısız",
      error: String(error?.message || error),
    })
  }
}
