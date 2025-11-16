import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TaxSettingsState {
  countryName: string
  vatRate: number
  setCountryName: (name: string) => void
  setVatRate: (rate: number) => void
  reset: () => void
}

export const useTaxSettingsStore = create<TaxSettingsState>()(
  persist(
    (set) => ({
      countryName: '',
      vatRate: 0,
      setCountryName: (name) => set({ countryName: name }),
      setVatRate: (rate) => set({ vatRate: isFinite(rate) ? Math.max(0, rate) : 0 }),
      reset: () => set({ countryName: '', vatRate: 0 }),
    }),
    { name: 'admin-tax-settings' }
  )
)



