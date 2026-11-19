'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import ProductCard from '@/components/products/ProductCard'
import { useCurrencyStore } from '@/store/currencyStore'
import { useT } from '@/components/useT'
import { usePriceCap } from '@/hooks/usePriceCap'

export default function ProductsPage() {
  const t = useT()
  const { cap, ready: priceCapReady, isOverCap } = usePriceCap()
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(24)
  const [platform, setPlatform] = useState<string>('all')
  const [genre, setGenre] = useState<string>('all')
  const [priceMin, setPriceMin] = useState<number>(0)
  const [priceMax, setPriceMax] = useState<number>(1000)
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [sortBy, setSortBy] = useState<string>('popular')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])

  // Facet listeleri sunucudan gelir (koleksiyon = platform, kategori = tur).
  // Tum urunleri cekmek yerine sayfalanmis iki kucuk istek kullanilir.
  const { data: facetsData } = useQuery({
    queryKey: ['product-facets'],
    queryFn: async () => {
      const [collections, categories] = await Promise.all([
        api.get('/store/collections', { params: { limit: 100 } }),
        api.get('/store/product-categories', { params: { limit: 100 } }),
      ])
      return {
        platforms: (collections.data.collections || [])
          .map((c: any) => c.title)
          .filter(Boolean),
        genres: (categories.data.product_categories || [])
          .map((c: any) => c.name)
          .filter(Boolean),
      }
    },
  })

  useEffect(() => {
    if (facetsData) {
      setPlatforms(facetsData.platforms.sort())
      setGenres(facetsData.genres.sort())
    }
  }, [facetsData])

  // Close price filter when clicking outside
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

  // Sunucu tarafi sayfalama: filtre + siralama + sayfalama backend'de yapilir.
  // Fiyat filtreleri USD'ye cevrilir (kurlar USD bazli: rate = USD -> secilen kur).
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, limit, platform, genre, priceMin, priceMax, sortBy, cap, selectedCurrency.code],
    queryFn: async () => {
      const rate = Number(selectedCurrency.rate) || 1
      // Secilen kur -> USD (min/max cinsinden major unit)
      // Yalnizca kullanici varsayilan araliktan (0 - 1000) farkli bir fiyat filtrelediyse gonder
      const hasMin = priceMin > 0
      const hasMax = priceMax < 1000
      const minUsd = hasMin ? priceMin / rate : undefined
      const maxUsd = hasMax ? priceMax / rate : undefined

      const response = await api.get('/store/products/search', {
        params: {
          platform: platform !== 'all' ? platform : undefined,
          genre: genre !== 'all' ? genre : undefined,
          price_min: minUsd,
          price_max: maxUsd,
          sort_by: sortBy === 'popular' ? undefined : sortBy,
          limit,
          offset: (page - 1) * limit,
        },
      })

      let products = response.data.products || []

      // Admin tarafinda belirlenen listeleme ust fiyat limiti (EUR)
      if (cap > 0) {
        products = products.filter((p: any) => !isOverCap(p))
      }

      return {
        products,
        count: response.data.count || 0,
      }
    },
    placeholderData: (previousData) => previousData,
  })

  const showSkeleton = isLoading || !data
  const products = data?.products || []
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a1d24] to-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            {t('catalog.allGamesTitle')}
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
          <p className="text-gray-400 text-lg">{t('catalog.allGamesSubtitle')}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters Bar */}
        <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <select
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] focus:border-[#ff6b35] focus:outline-none text-sm font-semibold"
              >
                <option value="all">{t('catalog.platformAll')}</option>
                {platforms.map(p => (
                  <option key={p} value={p}>{t('catalog.platformOption', { value: p })}</option>
                ))}
              </select>
              <select
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value)
                  setPage(1)
                }}
                className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] focus:border-[#ff6b35] focus:outline-none text-sm font-semibold"
              >
                <option value="all">{t('catalog.genreAll')}</option>
                {genres.map(g => (
                  <option key={g} value={g}>{t('catalog.genreOption', { value: g })}</option>
                ))}
              </select>
              <div className="relative price-filter-container">
                <button
                  onClick={() => setShowPriceFilter(!showPriceFilter)}
                  className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] hover:text-white transition text-sm font-semibold"
                >
                  {t('catalog.priceButton', { min: `${selectedCurrency.symbol}${priceMin}`, max: `${selectedCurrency.symbol}${priceMax}` })}
                </button>

                {showPriceFilter && (
                  <div className="absolute top-full start-0 mt-2 w-80 bg-[#1a1d24] border border-gray-700 rounded-lg p-6 shadow-xl z-50 price-filter-container">
                    <div className="mb-4">
                      <label className="text-white text-sm font-semibold mb-2 block">{t('catalog.priceRange')} ({selectedCurrency.code})</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-gray-400 text-xs mb-1 block">{t('catalog.priceMin', { symbol: selectedCurrency.symbol })}</label>
                          <input
                            type="number"
                            value={priceMin}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setPriceMin(Math.max(0, Math.min(val, priceMax)))
                              setPage(1)
                            }}
                            className="w-full bg-[#15171c] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-gray-400 text-xs mb-1 block">{t('catalog.priceMax', { symbol: selectedCurrency.symbol })}</label>
                          <input
                            type="number"
                            value={priceMax}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setPriceMax(Math.max(priceMin, val))
                              setPage(1)
                            }}
                            className="w-full bg-[#15171c] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
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
                          setPage(1)
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
                          setPage(1)
                        }}
                        className="w-full accent-[#ff6b35] mt-2"
                      />
                    </div>

                    <button
                      onClick={() => setShowPriceFilter(false)}
                      className="w-full px-4 py-2 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-lg font-bold hover:shadow-lg transition"
                    >
                      {t('catalog.apply')}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] focus:border-[#ff6b35] focus:outline-none text-sm font-semibold"
            >
              <option value="popular">{t('catalog.sortPopular')}</option>
              <option value="low-high">{t('catalog.sortLowHigh')}</option>
              <option value="high-low">{t('catalog.sortHighLow')}</option>
              <option value="a-z">{t('catalog.nameAsc')}</option>
              <option value="newest">{t('catalog.sortNewest')}</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {showSkeleton ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="gaming-card overflow-hidden">
                <div className="bg-gradient-to-br from-[#1a1d24] to-[#252a34] animate-pulse h-56" />
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-[#252a34] rounded animate-pulse" />
                  <div className="h-4 bg-[#252a34] rounded animate-pulse w-3/4" />
                  <div className="h-8 bg-[#252a34] rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-2xl font-bold mb-2 text-white">{t('catalog.loadFailedTitle')}</h3>
            <p className="text-gray-400 mb-6">{t('catalog.loadFailedDesc')}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              {t('catalog.tryAgain')}
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold mb-2 text-white">{t('catalog.noProductsAvailable')}</h3>
            <p className="text-gray-400 mb-6">{t('catalog.checkBack')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-[#15171c] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <label htmlFor="productsPerPage" className="text-gray-400 text-sm">
                    {t('catalog.perPage')}
                  </label>
                  <select
                    id="productsPerPage"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1)
                    }}
                    className="bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg text-sm"
                  >
                    <option value={24}>24</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('catalog.previous')}
                  </button>
                  <span className="text-white px-4">
                    {t('catalog.pageOf', { page, total: totalPages })}
                  </span>
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('catalog.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
