import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'
import {
  createServerCart,
  fetchServerCart,
  serverAddItem,
  serverRemoveItem,
  serverUpdateItem,
} from '@/lib/server-cart'
import { getCartLimitEur } from '@/lib/cart-limit'
import { useCurrencyStore } from '@/store/currencyStore'
import { convertAmount } from '@/utils/currency'

export interface CartItem {
  id: string
  variantId: string
  productId: string
  title: string
  handle: string
  thumbnail: string
  price: number
  currency: string
  quantity: number
  lineId?: string
  metadata?: {
    platform?: string
    region?: string
  }
}

interface CartStore {
  items: CartItem[]
  serverCartId: string | null
  serverSyncing: boolean
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  hydrateFromServer: () => Promise<void>
  getTotalItems: () => number
  getTotalPrice: () => number
  getItem: (variantId: string) => CartItem | undefined
}

// Sunucu senkronu arka planda yürür; hata olursa yerel ayna kalir, sessizce loglanir
function syncError(scope: string, e: any) {
  if (typeof console !== 'undefined') console.warn(`[server-cart] ${scope} failed:`, e?.message)
}

// Sepet ust limiti kontrolu: mevcut sepet + eklenecek tutar (minor) EUR'ya
// cevrilerek karsilastirilir. Limit asilacaksa true doner (ekleme YAPILMAZ).
function wouldExceedLimit(currentItems: CartItem[], additionalMinor: number, additionalCurrency: string): boolean {
  const limitEur = getCartLimitEur()
  if (limitEur <= 0) return false
  const rates = useCurrencyStore.getState().currencies || []
  const currentEurMinor = currentItems.reduce(
    (sum, i) => sum + convertAmount(i.price * i.quantity, i.currency, 'eur', rates),
    0
  )
  const addEurMinor = convertAmount(additionalMinor, additionalCurrency, 'eur', rates)
  return currentEurMinor + addEurMinor > limitEur * 100
}

function notifyLimitBlocked() {
  const limitEur = getCartLimitEur()
  toast.error(`Sepet üst limiti (${limitEur} EUR) aşıldığı için ürün eklenemedi.`)
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      serverCartId: null,
      serverSyncing: false,

      addItem: (item) => {
        // Sepet ust limiti: eklenince asilacaksa ekleme
        if (wouldExceedLimit(get().items, item.price, item.currency)) {
          notifyLimitBlocked()
          return
        }

        set((state) => {
          const existingItem = state.items.find((i) => i.variantId === item.variantId)

          if (existingItem) {
            // Update quantity if item already exists
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }

          // Add new item with quantity 1
          return {
            items: [...state.items, { ...item, quantity: 1 }],
          }
        })

        // Arka planda sunucu sepetine yaz — fiyat/adet sunucuda doğrulanır
        void (async () => {
          try {
            set({ serverSyncing: true })
            let cartId = get().serverCartId
            if (!cartId) {
              cartId = await createServerCart()
              set({ serverCartId: cartId })
            }
            const local = get().getItem(item.variantId)
            const qty = local?.quantity || 1
            const server = await fetchServerCart(cartId)
            const existing = server?.items.find((i) => i.variant_id === item.variantId)
            if (existing) {
              // Medusa tekrar POST line-items atarsa adedi ARTIRIR — set etmek icin update
              await serverUpdateItem(cartId, existing.id, qty)
            } else {
              await serverAddItem(cartId, item.variantId, qty)
            }
            const refreshed = await fetchServerCart(cartId)
            const line = refreshed?.items.find((i) => i.variant_id === item.variantId)
            if (line) {
              set((state) => ({
                items: state.items.map((i) =>
                  i.variantId === item.variantId
                    ? {
                        ...i,
                        quantity: line.quantity,
                        lineId: line.id,
                        // storefront konvansiyonu: price minor unit (formatMoney /100 yapar)
                        price: line.unit_price,
                        currency: 'usd',
                      }
                    : i
                ),
              }))
            }
          } catch (e) {
            syncError('addItem', e)
          } finally {
            set({ serverSyncing: false })
          }
        })()
      },

      removeItem: (variantId) => {
        const target = get().items.find((i) => i.variantId === variantId)
        set((state) => ({
          items: state.items.filter((item) => item.variantId !== variantId),
        }))

        void (async () => {
          try {
            const cartId = get().serverCartId
            if (!cartId) return
            let lineId = target?.lineId
            if (!lineId) {
              const server = await fetchServerCart(cartId)
              lineId = server?.items.find((i) => i.variant_id === variantId)?.id
            }
            if (lineId) await serverRemoveItem(cartId, lineId)
          } catch (e) {
            syncError('removeItem', e)
          }
        })()
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId)
          return
        }

        // adet artisi limiti asiyorsa eski adette kal
        const current = get().items.find((i) => i.variantId === variantId)
        if (current && quantity > current.quantity) {
          const delta = (quantity - current.quantity) * current.price
          if (wouldExceedLimit(get().items, delta, current.currency)) {
            notifyLimitBlocked()
            return
          }
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.variantId === variantId ? { ...item, quantity } : item
          ),
        }))

        void (async () => {
          try {
            const cartId = get().serverCartId
            if (!cartId) return
            let lineId = get().items.find((i) => i.variantId === variantId)?.lineId
            if (!lineId) {
              const server = await fetchServerCart(cartId)
              lineId = server?.items.find((i) => i.variant_id === variantId)?.id
              if (lineId) {
                set((state) => ({
                  items: state.items.map((i) =>
                    i.variantId === variantId ? { ...i, lineId } : i
                  ),
                }))
              }
            }
            if (lineId) await serverUpdateItem(cartId, lineId, Math.min(99, quantity))
          } catch (e) {
            syncError('updateQuantity', e)
          }
        })()
      },

      clearCart: () => {
        // Siparis tamamlaninca server cart da terk edilir; yeni sepet yaratilir
        set({ items: [], serverCartId: null })
      },

      hydrateFromServer: async () => {
        const cartId = get().serverCartId
        if (!cartId) return
        try {
          set({ serverSyncing: true })
          const server = await fetchServerCart(cartId)
          if (!server) {
            // server cart yok olmus (tamamlanmis/temizlenmis) — yerel aynayi da bosalt
            set({ items: [], serverCartId: null, serverSyncing: false })
            return
          }
          set((state) => {
            const byVariant = new Map(server.items.map((i) => [i.variant_id, i]))
            const merged = state.items
              .map((item) => {
                const line = byVariant.get(item.variantId)
                if (!line) return null
                return {
                  ...item,
                  quantity: line.quantity,
                  lineId: line.id,
                }
              })
              .filter((i): i is CartItem => i !== null)
            // sunucuda olup yerelde olmayan ogeleri ekle (baska sekmeden eklenenler)
            for (const line of server.items) {
              if (!merged.some((m) => m.variantId === line.variant_id)) {
                merged.push({
                  id: `${cartId}-${line.variant_id}`,
                  variantId: line.variant_id,
                  productId: '',
                  title: line.title || line.variant_id,
                  handle: '',
                  thumbnail: line.thumbnail || '',
                  // storefront konvansiyonu: price minor unit
                  price: line.unit_price,
                  currency: 'usd',
                  quantity: line.quantity,
                  lineId: line.id,
                })
              }
            }
            return { items: merged, serverSyncing: false }
          })
        } catch (e) {
          syncError('hydrate', e)
          set({ serverSyncing: false })
        }
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0)
      },

      getItem: (variantId) => {
        return get().items.find((item) => item.variantId === variantId)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)
