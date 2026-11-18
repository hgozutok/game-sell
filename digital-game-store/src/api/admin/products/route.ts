import { MedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import KeyInventoryService from '../../../modules/key-inventory/service'


// GET /admin/products - ürün listesi (filtre + sayfalama)
// Not: productModule.listProducts ilişki (relations) ile bu sürümde MikroORM
// hatası veriyor; fiyatlar query graph üzerinden çekilir.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const {
      skip,
      take,
      offset,
      limit,
      hideZeroPrice = 'false',
      hideZeroStock = 'false',
      collection_id,
    } = req.query as any

    const skipParam = Number(skip ?? offset ?? 0)
    const takeParam = Number(take ?? limit ?? 50)

    const { data: allProducts } = await query.graph({
      entity: 'product',
      fields: [
        'id',
        'title',
        'handle',
        'thumbnail',
        'status',
        'collection_id',
        'metadata',
        'variants.id',
        'variants.prices.amount',
        'variants.prices.currency_code',
      ],
      pagination: { take: 5000, skip: 0 },
    })

    let filteredProducts: any[] = allProducts || []

    // Koleksiyon filtresi
    if (collection_id) {
      filteredProducts = filteredProducts.filter(
        (product: any) => product.collection_id === collection_id
      )
    }

    // Fiyatı 0 olanları gizle
    if (hideZeroPrice === 'true') {
      filteredProducts = filteredProducts.filter((product: any) => {
        const price = product.variants?.[0]?.prices?.[0]?.amount || 0
        return price > 0
      })
    }

    // Stoğu 0 olanları gizle (dijital anahtar envanteri)
    if (hideZeroStock === 'true') {
      try {
        const keyInventoryService = req.scope.resolve('keyInventory') as KeyInventoryService
        const withStock = await Promise.all(
          filteredProducts.map(async (product: any) => ({
            product,
            stockCount: await keyInventoryService.getInventoryCount(product.id),
          }))
        )
        filteredProducts = withStock.filter(({ stockCount }) => stockCount > 0).map(({ product }) => product)
      } catch (keyError: any) {
        console.warn('[Admin Products] Key inventory check skipped:', keyError.message)
      }
    }

    // Filtre yoksa sayi DB'den tam okunur; 5000'lik sorgu penceresi sayiyi kirpmaz.
    const hasFilters = Boolean(collection_id) || hideZeroPrice === 'true' || hideZeroStock === 'true'
    let count = filteredProducts.length
    if (!hasFilters) {
      try {
        const productModule = req.scope.resolve('product') as any
        const [, total] = await productModule.listAndCountProducts({}, { take: 1 })
        if (Number.isFinite(Number(total))) count = Number(total)
      } catch {
        // servis sayimi basarisizsa liste uzunlugu kullanilir
      }
    }
    const products = filteredProducts.slice(skipParam, skipParam + takeParam)

    res.json({
      products,
      count,
      limit: takeParam,
      offset: skipParam,
    })
  } catch (error: any) {
    console.error('Failed to fetch products:', error)
    res.status(500).json({
      message: 'Failed to fetch products',
      error: error.message,
    })
  }
}
