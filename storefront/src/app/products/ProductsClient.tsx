'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '@/components/products/ProductCard'
import { useCurrencyStore } from '@/store/currencyStore'
import { useT } from '@/components/useT'
import { usePriceCap } from '@/hooks/usePriceCap'

interface ProductsClientProps {
  initialProducts: any[]
  initialCount: number
  initialPlatforms: string[]
  initialGenres: string[]
  currentPage: number
  currentLimit: number
  currentPlatform: string
  currentGenre: string
  currentSort: string
  currentPriceMin: number
  currentPriceMax: number
}

function buildQueryUrl(
  updates: Record<string, string | number | undefined>,
  searchParams: URLSearchParams
): string {
  const next = new URLSearchParams(searchParams.toString())
  for (const [key, value] of Object.entries(updates)) {
    if (
      value === undefined ||
      value === '' ||
      value === 'all' ||
      (key === 'page' && Number(value) <= 1) ||
      (key === 'limit' && Number(value) === 20) ||
      (key === 'sort' && value === 'popular') ||
      (key === 'min' && Number(value) <= 0) ||
      (key === 'max' && Number(value) >= 1000)
    ) {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
  }
  const q = next.toString()
  return q ? `/products?${q}` : '/products'
}

export default function ProductsClient({
  initialProducts,
  initialCount,
  initialPlatforms,
  initialGenres,
  currentPage,
  currentLimit,
  currentPlatform,
  currentGenre,
  currentSort,
  currentPriceMin,
  currentPriceMax,
}: ProductsClientProps) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const { cap, isOverCap } = usePriceCap()
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency)

  const [priceMin, setPriceMin] = useState<number>(currentPriceMin)
  const [priceMax, setPriceMax] = useState<number>(currentPriceMax)
  const [showPriceFilter, setShowPriceFilter] = useState(false)

  // Disaridan tiklandiginda fiyat filtresi acilir menusunu kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.price-filter-container')) {
        setShowPriceFilter(false)
      }
    }

    if (showPriceFilter) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPriceFilter])

  // URL guncelleme fonksiyonu (sayfalama veya filtre degisiminde kalici URL gecisi)
  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const url = buildQueryUrl(updates, searchParams)
    startTransition(() => {
      router.push(url, { scroll: true })
    })
  }

  // Fiyat filtresini uygula
  const applyPriceFilter = () => {
    setShowPriceFilter(false)
    updateFilters({ min: priceMin, max: priceMax, page: 1 })
  }

  // Fiyat filtresini sifirla
  const resetPriceFilter = () => {
    setPriceMin(0)
    setPriceMax(1000)
    setShowPriceFilter(false)
    updateFilters({ min: undefined, max: undefined, page: 1 })
  }

  // Urunleri admin ust fiyat limitine gore filtrele
  let displayProducts = initialProducts
  if (cap > 0) {
    displayProducts = displayProducts.filter((p: any) => !isOverCap(p))
  }

  const totalPages = Math.max(1, Math.ceil(initialCount / currentLimit))

  // Sayfalama dugmeleri hesaplama (1, 2, ... 5, 6, 7 ... N)
  const getPaginationPages = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      if (start > 2) pages.push('ellipsis')
      for (let i = start; i <= end; i++) pages.push(i)
      if (end < totalPages - 1) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }

  const hasActivePrice = currentPriceMin > 0 || currentPriceMax < 1000

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Filtre ve Siralama Bari */}
      <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Platform Dropdown */}
            <select
              value={currentPlatform}
              onChange={(e) => updateFilters({ platform: e.target.value, page: 1 })}
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] focus:border-[#ff6b35] focus:outline-none text-sm font-semibold transition"
              aria-label="Platform filtresi"
            >
              <option value="all">{t('catalog.platformAll')}</option>
              {initialPlatforms.map((p) => (
                <option key={p} value={p}>
                  {t('catalog.platformOption', { value: p })}
                </option>
              ))}
            </select>

            {/* Genre Dropdown */}
            <select
              value={currentGenre}
              onChange={(e) => updateFilters({ genre: e.target.value, page: 1 })}
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] focus:border-[#ff6b35] focus:outline-none text-sm font-semibold transition"
              aria-label="Tür filtresi"
            >
              <option value="all">{t('catalog.genreAll')}</option>
              {initialGenres.map((g) => (
                <option key={g} value={g}>
                  {t('catalog.genreOption', { value: g })}
                </option>
              ))}
            </select>

            {/* Fiyat Filtresi Butonu */}
            <div className="relative price-filter-container">
              <button
                type="button"
                onClick={() => setShowPriceFilter(!showPriceFilter)}
                className={`px-4 py-2 bg-[#1a1d24] border rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  hasActivePrice
                    ? 'border-[#ff6b35] text-[#ff6b35]'
                    : 'border-gray-700 text-gray-300 hover:border-[#ff6b35] hover:text-white'
                }`}
              >
                <span>
                  {t('catalog.priceButton', {
                    min: `${selectedCurrency.symbol}${priceMin}`,
                    max: `${selectedCurrency.symbol}${priceMax}`,
                  })}
                </span>
                {hasActivePrice && (
                  <span className="w-2 h-2 rounded-full bg-[#ff6b35]" />
                )}
              </button>

              {showPriceFilter && (
                <div className="absolute top-full start-0 mt-2 w-80 bg-[#1a1d24] border border-gray-700 rounded-lg p-6 shadow-2xl z-50 price-filter-container">
                  <div className="mb-4">
                    <label className="text-white text-sm font-semibold mb-2 block">
                      {t('catalog.priceRange')} ({selectedCurrency.code})
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-gray-400 text-xs mb-1 block">
                          {t('catalog.priceMin', { symbol: selectedCurrency.symbol })}
                        </label>
                        <input
                          type="number"
                          value={priceMin}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setPriceMin(Math.max(0, Math.min(val, priceMax)))
                          }}
                          className="w-full bg-[#15171c] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-[#ff6b35] focus:outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-gray-400 text-xs mb-1 block">
                          {t('catalog.priceMax', { symbol: selectedCurrency.symbol })}
                        </label>
                        <input
                          type="number"
                          value={priceMax}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setPriceMax(Math.max(priceMin, val))
                          }}
                          className="w-full bg-[#15171c] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-[#ff6b35] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceMin}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setPriceMin(Math.min(val, priceMax - 1))
                      }}
                      className="w-full accent-[#ff6b35]"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      value={priceMax}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setPriceMax(Math.max(val, priceMin + 1))
                      }}
                      className="w-full accent-[#ff6b35] mt-2"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={applyPriceFilter}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition text-sm"
                    >
                      {t('catalog.apply')}
                    </button>
                    {hasActivePrice && (
                      <button
                        type="button"
                        onClick={resetPriceFilter}
                        className="px-3 py-2 bg-[#15171c] border border-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Aktif Filtreleri Temizle Butonu */}
            {(currentPlatform !== 'all' || currentGenre !== 'all' || hasActivePrice || currentSort !== 'popular') && (
              <button
                type="button"
                onClick={() => {
                  setPriceMin(0)
                  setPriceMax(1000)
                  startTransition(() => {
                    router.push('/products', { scroll: true })
                  })
                }}
                className="px-3 py-2 text-xs text-gray-400 hover:text-[#ff6b35] transition"
              >
                {t('catalog.clearFilters') || 'Filtreleri Temizle'}
              </button>
            )}
          </div>

          {/* Sıralama Dropdown */}
          <div className="flex items-center gap-3">
            <label htmlFor="sortSelect" className="text-gray-400 text-sm hidden sm:block">
              {t('catalog.sortBy')}:
            </label>
            <select
              id="sortSelect"
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] focus:border-[#ff6b35] focus:outline-none text-sm font-semibold transition"
            >
              <option value="popular">{t('catalog.sortPopular')}</option>
              <option value="low-high">{t('catalog.sortLowHigh')}</option>
              <option value="high-low">{t('catalog.sortHighLow')}</option>
              <option value="a-z">{t('catalog.nameAsc')}</option>
              <option value="newest">{t('catalog.sortNewest')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Yukleniyor Durumu (Gecis esnasinda yari seffaf) */}
      <div className={`transition-opacity duration-200 ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        {displayProducts.length === 0 ? (
          <div className="text-center py-16 bg-[#15171c] border border-gray-800 rounded-xl">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold mb-2 text-white">
              {t('catalog.noProductsAvailable')}
            </h3>
            <p className="text-gray-400 mb-6">{t('catalog.checkBack')}</p>
            <button
              type="button"
              onClick={() => router.push('/products')}
              className="btn-primary"
            >
              {t('catalog.allGamesTitle')}
            </button>
          </div>
        ) : (
          <>
            {/* Urun Kartlari Izgarasi (SSR olarak direkt HTML icinde basilir) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Kalıcı & Crawlable Sayfalama Barı */}
            <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4 bg-[#15171c] border border-gray-800 rounded-xl p-6">
              {/* Sayfa basina urun limiti */}
              <div className="flex items-center gap-4">
                <label htmlFor="productsPerPage" className="text-gray-400 text-sm">
                  {t('catalog.perPage')}
                </label>
                <select
                  id="productsPerPage"
                  value={currentLimit}
                  onChange={(e) => updateFilters({ limit: Number(e.target.value), page: 1 })}
                  className="bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:border-[#ff6b35] focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={40}>40</option>
                  <option value={80}>80</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-gray-500 text-xs hidden sm:inline">
                  (Toplam {initialCount.toLocaleString('tr-TR')} oyun)
                </span>
              </div>

              {/* Sayfa Navigasyon Dugmeleri (Gercek HTML Link Etiketleri) */}
              {totalPages > 1 && (
                <nav
                  aria-label="Ürün Sayfalaması"
                  className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center"
                >
                  {/* Onceki Sayfa */}
                  {currentPage > 1 ? (
                    <Link
                      href={buildQueryUrl({ page: currentPage - 1 }, searchParams)}
                      rel="prev"
                      className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] hover:text-[#ff6b35] transition text-sm font-semibold"
                    >
                      {t('catalog.previous')}
                    </Link>
                  ) : (
                    <span className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-800 text-gray-600 rounded-lg text-sm font-semibold cursor-not-allowed">
                      {t('catalog.previous')}
                    </span>
                  )}

                  {/* Numarali Sayfa Dugmeleri */}
                  {getPaginationPages().map((p, idx) => {
                    if (p === 'ellipsis') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 py-2 text-gray-500 text-sm">
                          …
                        </span>
                      )
                    }

                    const isCurrent = p === currentPage
                    const pageUrl = buildQueryUrl({ page: p }, searchParams)

                    return isCurrent ? (
                      <span
                        key={p}
                        aria-current="page"
                        className="px-3 sm:px-4 py-2 bg-[#ff6b35] text-white rounded-lg text-sm font-bold shadow-md shadow-[#ff6b35]/20"
                      >
                        {p}
                      </span>
                    ) : (
                      <Link
                        key={p}
                        href={pageUrl}
                        className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] hover:text-white transition text-sm font-semibold"
                      >
                        {p}
                      </Link>
                    )
                  })}

                  {/* Sonraki Sayfa */}
                  {currentPage < totalPages ? (
                    <Link
                      href={buildQueryUrl({ page: currentPage + 1 }, searchParams)}
                      rel="next"
                      className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] hover:text-[#ff6b35] transition text-sm font-semibold"
                    >
                      {t('catalog.next')}
                    </Link>
                  ) : (
                    <span className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-800 text-gray-600 rounded-lg text-sm font-semibold cursor-not-allowed">
                      {t('catalog.next')}
                    </span>
                  )}
                </nav>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
