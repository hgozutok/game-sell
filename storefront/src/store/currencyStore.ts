import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import { saveUserPrefs, getLocalPrefs } from '@/lib/prefs'

export interface Currency {
  code: string
  symbol: string
  name: string
  rate: number
}

interface CurrencyState {
  selectedCurrency: Currency
  currencies: Currency[]
  setSelectedCurrency: (currency: Currency) => void
  loadCurrencyRates: () => Promise<void>
  getRate: (code: string) => number | undefined
}

const defaultCurrencies = [
  { code: 'usd', symbol: '$', name: 'US Dollar', rate: 1 },
  { code: 'eur', symbol: '€', name: 'Euro', rate: 0.92 },
  { code: 'gbp', symbol: '£', name: 'British Pound', rate: 0.79 },
  { code: 'try', symbol: '₺', name: 'Turkish Lira', rate: 34.50 },
]

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      selectedCurrency: defaultCurrencies[0],
      currencies: defaultCurrencies,
      setSelectedCurrency: (currency) => {
        set({ selectedCurrency: currency })
        // hesaba kaydet (girissiz kullanici icin yerel ayna)
        saveUserPrefs({ currency: currency.code })
      },
      loadCurrencyRates: async () => {
        try {
          const [ratesResponse, settingsResponse] = await Promise.all([
            api.get('/store/settings/currency_rates'),
            api.get('/store/settings'),
          ])

          const rates = ratesResponse.data.value
            ? (JSON.parse(ratesResponse.data.value) as Currency[])
            : defaultCurrencies

          const displayCurrencyCode = settingsResponse.data?.currencies?.display?.toLowerCase()
          set({ currencies: rates })

          // Oncelik: URL ?currency= > kullanici kaydi (hesap tercihi/lokal ayna) >
          // admin display currency > mevcut secim > ilk kur
          const urlCurrency =
            typeof window !== 'undefined'
              ? new URLSearchParams(window.location.search).get('currency')?.toLowerCase()
              : undefined
          const savedUserCurrency = getLocalPrefs().currency?.toLowerCase()

          const matchedCurrency =
            rates.find((rate) => rate.code === urlCurrency) ||
            rates.find((rate) => rate.code === savedUserCurrency) ||
            rates.find((rate) => rate.code === displayCurrencyCode) ||
            rates.find((rate) => rate.code === get().selectedCurrency.code) ||
            rates[0]

          if (matchedCurrency) {
            set({ selectedCurrency: matchedCurrency })
          }
        } catch (error) {
          console.log('Using default currency rates')
          set({ currencies: defaultCurrencies, selectedCurrency: defaultCurrencies[0] })
        }
      },
      getRate: (code: string) => {
        const { currencies } = get()
        return currencies.find((currency) => currency.code === code.toLowerCase())?.rate
      },
    }),
    {
      name: 'currency-storage',
    }
  )
)

