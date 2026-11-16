// Ilk kurulumda publishable API key olusturur (zaten varsa yazdirir) ve
// Default Sales Channel'a baglar. Calistirma: npx medusa exec ./scripts/ensure-publishable-key.ts
// Storefront'un NEXT_PUBLIC_PUBLISHABLE_KEY'i bu token ile beslenir.
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

type ExecArgs = { args: Record<string, any>; container: any }

export default async function ensurePublishableKey({ container }: ExecArgs) {
  const apiKeyModule = container.resolve(Modules.API_KEY) as any
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL) as any
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK) as any
  const logger = container.resolve("logger") as any

  const channels = await salesChannelModule.listSalesChannels({ name: "Default Sales Channel" })
  const channelId = channels?.[0]?.id
  if (!channelId) {
    throw new Error("Default Sales Channel bulunamadi — once medusa seed calistirin")
  }

  const existing = await apiKeyModule.listApiKeys({ type: "publishable" })
  let key = existing?.[0]
  if (!key) {
    key = await apiKeyModule.createApiKeys({
      type: "publishable",
      title: "Default Publishable Key",
      created_by: "system:ensure-key",
    })
    logger?.info?.(`[ensure-key] yeni publishable key olusturuldu`)
  } else {
    logger?.info?.(`[ensure-key] mevcut publishable key bulundu`)
  }

  // Key'i Default Sales Channel'a bagla (store istekleri bunu zorunlu kilar).
  // remoteLink tanimi exec baglaminda yuklu olmadigi icin link tablosuna
  // dogrudan yazariz (idempotent: ON CONFLICT DO NOTHING).
  const db = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any
  await db("publishable_api_key_sales_channel")
    .insert({
      id: `apksc_${key.id.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}`,
      publishable_key_id: key.id,
      sales_channel_id: channelId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .onConflict(["publishable_key_id", "sales_channel_id"])
    .ignore()
    .catch((e: any) => {
      // baglanti zaten varsa/kolon farkliliklari varsa sessiz gec
      console.log(`[ensure-key] link yazimi atlandi: ${e?.message}`)
    })
  logger?.info?.(`[ensure-key] key Default Sales Channel'a bagli (${channelId})`)

  console.log(`PUBLISHABLE_KEY=${key.token}`)
}
