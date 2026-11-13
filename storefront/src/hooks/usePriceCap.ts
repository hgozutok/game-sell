'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { useCurrencyStore } from '@/store/currencyStore'

type CurrencyRate = { code: string; rate: number }

let cachedCap: number | null = null
let inflight: Promise<number> | null = null

function loadCap(): Promise<number> {
  if (cachedCap !== null) return Promise.resolve(cachedCap)
  if (!inflight) {
    inflight = api
      .get('/store/settings')
      .then((res) => {
        cachedCap = Number(res.data?.catalog?.max_price_eur) || 0
        return cachedCap
      })
      .catch(() => {
        // Ayar okunamazsa listeyi kisitlamayalim
        cachedCap = 0
        return 0
      })
  }
  return inflight
}

/** Urunun musteri fiyatini EUR'ya cevirir (kurlar USD bazli). */
export function priceInEur(product: any, currencies: CurrencyRate[]): number | null {
  const prices: any[] = product?.variants?.[0]?.prices || []
  if (prices.length === 0) return null

  const price =
    prices.find((p) => p.currency_code === 'usd') ||
    prices.find((p) => p.currency_code === 'eur') ||
    prices[0]

  if (!price?.amount) return null

  const rateOf = (code: string) =>
    currencies.find((c) => c.code?.toLowerCase() === code)?.rate || 1

  const from = rateOf(String(price.currency_code || 'usd').toLowerCase())
  const eur = rateOf('eur')

  return (Number(price.amount) / 100 / from) * eur
}

/**
 * Admin > Magaza Ayarlari > "Listeleme ust fiyat limiti (EUR)" degerini okur.
 * 0 ise limit yoktur.
 */
export function usePriceCap() {
  const currencies = useCurrencyStore((state) => state.currencies)
  const [cap, setCap] = useState<number>(cachedCap ?? 0)
  const [ready, setReady] = useState<boolean>(cachedCap !== null)

  useEffect(() => {
    let active = true
    loadCap().then((value) => {
      if (!active) return
      setCap(value)
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  const isOverCap = (product: any) => {
    if (!cap || cap <= 0) return false
    const eur = priceInEur(product, currencies as CurrencyRate[])
    return eur !== null && eur > cap
  }

  return { cap, ready, isOverCap }
}
