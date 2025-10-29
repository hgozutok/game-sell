import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface Currency {
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
      setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
      loadCurrencyRates: async () => {
        try {
          const response = await api.get('/store/settings/currency_rates')
          if (response.data.value) {
            const rates = JSON.parse(response.data.value) as Currency[]
            set({ currencies: rates })
            
            // Update selected currency if it exists in new rates
            const currentCode = get().selectedCurrency.code
            const updatedCurrency = rates.find(r => r.code === currentCode)
            if (updatedCurrency) {
              set({ selectedCurrency: updatedCurrency })
            }
          }
        } catch (error) {
          console.log('Using default currency rates')
        }
      },
    }),
    {
      name: 'currency-storage',
    }
  )
)

