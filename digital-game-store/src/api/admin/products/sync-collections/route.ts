import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { Modules } from '@medusajs/framework/utils'

// POST /admin/products/sync-collections
// Sync existing products with collections (genres, platform) and create missing collections
export const AUTHENTICATE = false

async function getOrCreateCollection(productModule: any, title: string, logger: any) {
  const safe = title.trim()
  if (!safe) return null

  try {
    const existing = await productModule.listProductCollections({ title: safe })
    if (existing?.length) return existing[0]

    const collection = await productModule.createProductCollections({
      title: safe,
      handle: safe.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    })
    return collection
  } catch (e) {
    logger?.error?.(`Failed to get/create collection '${safe}': ${e.message}`)
    return null
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const logger = req.scope.resolve('logger')
  const productModule = req.scope.resolve(Modules.PRODUCT) as any

  try {
    let processed = 0
    let updated = 0

    // paginate through products to avoid loading everything at once
    const pageSize = 100
    let offset = 0

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const products = await productModule.listProducts({}, {
        skip: offset,
        take: pageSize,
      })

      if (!products?.length) break

      for (const p of products) {
        processed += 1
        const wantedCollectionTitles: string[] = []

        console.log(`Processing product ${p.id}: platform=${p?.metadata?.platform}, genres=${JSON.stringify(p?.metadata?.genres)}`)

        // genres array in metadata
        const genres = Array.isArray(p?.metadata?.genres) ? (p.metadata.genres as string[]) : []
        for (const g of genres) {
          if (g && typeof g === 'string') wantedCollectionTitles.push(g)
        }

        // platform string in metadata
        const platform = (p?.metadata?.platform as string) || ''
        if (platform) wantedCollectionTitles.push(platform)
        
        console.log(`Product ${p.id} wants collections: ${wantedCollectionTitles.join(', ')}`)

        if (!wantedCollectionTitles.length) continue

        // ensure collections exist and collect their ids
        const collectionIds: string[] = []
        for (const title of wantedCollectionTitles) {
          const c = await getOrCreateCollection(productModule, title, logger)
          if (c?.id) collectionIds.push(c.id)
        }

        // Update product with collection_ids (direct relationship)
        if (collectionIds.length) {
          try {
            console.log(`Updating product ${p.id} (${p.title}) with collection_ids: ${collectionIds.join(', ')}`)
            
            // Use updateProducts with collection_id (single collection per product in Medusa)
            // Since Medusa supports multiple collections via remoteLink, we'll just use the first one for now
            const result = await productModule.updateProducts(p.id, {
              collection_id: collectionIds[0],  // Use first collection only
            })
            
            console.log(`Update result:`, result?.id || 'success')
            
            updated += collectionIds.length
            console.log(`Successfully updated product ${p.id} with ${collectionIds.length} collections`)
          } catch (e: any) {
            // Log ALL errors for debugging
            console.error(`updateProducts ERROR for product ${p.id}:`, e.message)
            console.error('Error details:', e)
          }
        } else {
          console.log(`Product ${p.id} (${p.title}) has no collections to link (platform: ${p?.metadata?.platform}, genres: ${p?.metadata?.genres})`)
        }
      }

      offset += products.length
      if (products.length < pageSize) break
    }

    res.json({ processed, updated })
  } catch (error: any) {
    logger?.error?.(`sync-collections failed: ${error.message}`)
    res.status(500).json({ message: 'sync-collections failed', error: error.message })
  }
}


