import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { saveUserPrefs } from '@/lib/prefs'

interface WishlistState {
  productIds: string[]
  toggle: (productId: string) => void
  add: (productId: string) => void
  remove: (productId: string) => void
  setIds: (ids: string[]) => void
  has: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      productIds: [],

      toggle: (productId) => {
        const exists = get().productIds.includes(productId)
        if (exists) {
          get().remove(productId)
        } else {
          get().add(productId)
        }
      },

      add: (productId) => {
        if (get().productIds.includes(productId)) return
        const ids = [...get().productIds, productId]
        set({ productIds: ids })
        saveUserPrefs({ wishlist: ids })
      },

      remove: (productId) => {
        const ids = get().productIds.filter((id) => id !== productId)
        set({ productIds: ids })
        saveUserPrefs({ wishlist: ids })
      },

      setIds: (ids) => set({ productIds: ids }),

      has: (productId) => get().productIds.includes(productId),
    }),
    {
      name: 'wishlist-storage',
    }
  )
)
