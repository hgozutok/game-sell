// One-off backfill: link existing Kinguin products to platform collections.
// Root cause: sync code sent `collection_ids` (plural) which Medusa v2 silently
// ignores; correct field is `collection_id` (singular, many-to-one).
import { Modules } from "@medusajs/framework/utils"
import { slugify } from "../utils/kinguin-sync"

export default async function ({ container }: any) {
  const productModule = container.resolve(Modules.PRODUCT)
  const logger = container.resolve("logger")

  const products = await productModule.listProducts(
    {},
    { relations: ["collection"], take: 10000 }
  )
  const kinguin = products.filter((p: any) => p.metadata?.provider === "kinguin")
  logger.info(`[backfill-collections] kinguin products: ${kinguin.length}`)

  // Resolve collection per platform (existing title match, else create with slugified handle)
  const collectionIdByPlatform: Record<string, string> = {}
  const getCollectionId = async (platform: string): Promise<string | null> => {
    if (!platform) return null
    if (collectionIdByPlatform[platform]) return collectionIdByPlatform[platform]
    try {
      const existing = await (productModule as any).listProductCollections({
        title: platform,
      })
      let id = existing?.length ? existing[0].id : null
      if (!id) {
        const created = await (productModule as any).createProductCollections({
          title: platform,
          handle: slugify(platform),
        })
        id = created.id
      }
      collectionIdByPlatform[platform] = id
      return id
    } catch (e: any) {
      logger.warn(`[backfill-collections] collection resolve failed for ${platform}: ${e?.message}`)
      return null
    }
  }

  let linked = 0
  let skipped = 0
  for (const p of kinguin) {
    const platform = String(p.metadata?.platform || "").trim()
    if (!platform) {
      skipped++
      continue
    }
    const collectionId = await getCollectionId(platform)
    if (!collectionId) {
      skipped++
      continue
    }
    if (p.collection_id === collectionId) {
      continue
    }
    await productModule.updateProducts(p.id, { collection_id: collectionId })
    linked++
  }

  logger.info(
    `[backfill-collections] done. linked=${linked}, already-linked=${kinguin.length - linked - skipped}, skipped=${skipped}`
  )
  logger.info(`[backfill-collections] collections used: ${JSON.stringify(collectionIdByPlatform)}`)
  process.exit(0)
}
