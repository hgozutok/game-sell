// One-off backfill: create Medusa product categories from Kinguin genres and
// link listed products. Collections are many-to-one (platform only), so genres
// must live in product categories (many-to-many via category_ids on update).
// Genres are read from the kinguin_product dump table (metadata.genres is
// mostly empty because it was copied at list time from genre-less dump rows).
import { Modules } from "@medusajs/framework/utils"
import { Client } from "pg"

export default async function ({ container }: any) {
  const productModule = container.resolve(Modules.PRODUCT)
  const logger = container.resolve("logger")

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error("DATABASE_URL is not set")
  const pg = new Client({ connectionString: dbUrl })
  await pg.connect()

  const rows = await pg.query(`
    SELECT kp.medusa_product_id AS pid,
           jsonb_array_elements_text(kp.genres) AS genre
    FROM kinguin_product kp
    WHERE kp.deleted_at IS NULL
      AND kp.medusa_product_id IS NOT NULL
      AND jsonb_array_length(kp.genres) > 0
  `)
  await pg.end()

  const genreToProducts = new Map<string, string[]>()
  for (const r of rows.rows) {
    const genre = String(r.genre).trim()
    if (!genre || !r.pid) continue
    if (!genreToProducts.has(genre)) genreToProducts.set(genre, [])
    genreToProducts.get(genre)!.push(r.pid)
  }
  logger.info(
    `[genre-backfill] dump rows: ${rows.rows.length}, distinct genres: ${genreToProducts.size}`
  )

  // Resolve or create a category per genre (cached)
  const categoryIdByGenre = new Map<string, string>()
  const getCategoryId = async (genre: string): Promise<string | null> => {
    const cached = categoryIdByGenre.get(genre)
    if (cached) return cached
    try {
      const existing = await (productModule as any).listProductCategories({ name: genre })
      let id = existing?.length ? existing[0].id : null
      if (!id) {
        const created = await (productModule as any).createProductCategories({
          name: genre,
          is_active: true,
          is_internal: false,
        })
        id = created.id
      }
      categoryIdByGenre.set(genre, id)
      return id
    } catch (e: any) {
      logger.warn(`[genre-backfill] category resolve failed for "${genre}": ${e?.message}`)
      return null
    }
  }
  for (const genre of [...genreToProducts.keys()]) await getCategoryId(genre)
  logger.info(`[genre-backfill] categories ready: ${categoryIdByGenre.size}`)

  // Load current products (only those referenced by the dump) with categories
  const pids = [...new Set([...genreToProducts.values()].flat())]
  const products: any[] = []
  const chunkSize = 100
  for (let i = 0; i < pids.length; i += chunkSize) {
    const chunk = await productModule.listProducts(
      { id: pids.slice(i, i + chunkSize) },
      { relations: ["categories"] }
    )
    products.push(...chunk)
  }
  logger.info(`[genre-backfill] products loaded: ${products.length}`)

  // Merge genre categories into each product's existing category_ids
  let linked = 0
  let missing = 0
  for (const p of products) {
    const genres = [...genreToProducts.entries()]
      .filter(([, ids]) => ids.includes(p.id))
      .map(([genre]) => genre)
    const genreCats = genres
      .map((g) => categoryIdByGenre.get(g))
      .filter((id): id is string => !!id)
    if (!genreCats.length) {
      missing++
      continue
    }
    const existing = (p.categories || []).map((c: any) => c.id)
    const merged = [...new Set([...existing, ...genreCats])]
    if (merged.length === existing.length) continue
    await productModule.updateProducts(p.id, { category_ids: merged })
    linked++
  }

  logger.info(`[genre-backfill] done. linked=${linked}, unchanged=${products.length - linked - missing}, missing=${missing}`)
  process.exit(0)
}
