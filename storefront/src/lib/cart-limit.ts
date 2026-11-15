// Sepet ust limiti: admin panel "Sepet Üst Limiti (EUR)" (cart.max_total_eur).
// 0/boş = limitsiz. addItem/updateQuantity guard'lari sync okur; uygulama
// acilisinda loadCartLimit() bir kez cagrilir (Providers).
import { api } from '@/lib/api'

let cachedLimit: number | null = null
let inflight: Promise<number> | null = null

export function loadCartLimit(): Promise<number> {
  if (cachedLimit !== null) return Promise.resolve(cachedLimit)
  if (!inflight) {
    inflight = api
      .get('/store/settings')
      .then((res) => {
        cachedLimit = Number(res.data?.cart?.max_total_eur) || 0
        return cachedLimit
      })
      .catch(() => {
        cachedLimit = 0
        return 0
      })
  }
  return inflight
}

/** EUR major birim cinsinden ust limit (0 = limitsiz). */
export function getCartLimitEur(): number {
  return cachedLimit ?? 0
}
