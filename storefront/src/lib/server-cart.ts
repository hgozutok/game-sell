// Sunucu tarafı sepet: Medusa standart /store/carts endpoint'leri.
// Sepet öğeleri backend'de tutulur; localStorage yalnızca UI aynası.
import { api } from '@/lib/api'

export interface ServerCartLine {
  id: string
  variant_id: string
  title: string | null
  product_title?: string | null
  thumbnail?: string | null
  quantity: number
  unit_price: number
}

export interface ServerCart {
  id: string
  items: ServerCartLine[]
  subtotal: number
  item_total: number
}

let regionIdCache: string | null = null

async function getRegionId(): Promise<string> {
  if (regionIdCache) return regionIdCache
  const res = await api.get('/store/regions', { params: { limit: 1 } })
  const id = res.data?.regions?.[0]?.id
  if (!id) throw new Error('No region configured')
  regionIdCache = id
  return id
}

export async function createServerCart(): Promise<string> {
  const region_id = await getRegionId()
  const res = await api.post('/store/carts', { region_id })
  const id = res.data?.cart?.id
  if (!id) throw new Error('Cart creation failed')
  return id
}

export async function fetchServerCart(cartId: string): Promise<ServerCart | null> {
  try {
    const res = await api.get(`/store/carts/${cartId}`)
    const cart = res.data?.cart
    if (!cart) return null
    return {
      id: cart.id,
      items: (cart.items || []).map((i: any) => ({
        id: i.id,
        variant_id: i.variant_id,
        title: i.product_title || i.title,
        product_title: i.product_title,
        thumbnail: i.thumbnail,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      subtotal: cart.subtotal,
      item_total: cart.item_total,
    }
  } catch (e: any) {
    if (e?.response?.status === 404) return null
    throw e
  }
}

export async function serverAddItem(
  cartId: string,
  variantId: string,
  quantity: number
): Promise<ServerCartLine | null> {
  const res = await api.post(`/store/carts/${cartId}/line-items`, {
    variant_id: variantId,
    quantity,
  })
  const items = res.data?.cart?.items || []
  const line = items.find((i: any) => i.variant_id === variantId)
  return line
    ? {
        id: line.id,
        variant_id: line.variant_id,
        title: line.product_title || line.title,
        thumbnail: line.thumbnail,
        quantity: line.quantity,
        unit_price: line.unit_price,
      }
    : null
}

export async function serverUpdateItem(
  cartId: string,
  lineId: string,
  quantity: number
): Promise<void> {
  await api.post(`/store/carts/${cartId}/line-items/${lineId}`, { quantity })
}

export async function serverRemoveItem(cartId: string, lineId: string): Promise<void> {
  await api.delete(`/store/carts/${cartId}/line-items/${lineId}`)
}
