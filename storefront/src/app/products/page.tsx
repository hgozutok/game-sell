'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import ProductCard from '@/components/products/ProductCard'
import { useCurrencyStore } from '@/store/currencyStore'

export default function ProductsPage() {
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [platform, setPlatform] = useState<string>('all')
  const [genre, setGenre] = useState<string>('all')
  const [priceMin, setPriceMin] = useState<number>(0)
  const [priceMax, setPriceMax] = useState<number>(1000)
  const [showPriceFilter, setShowPriceFilter] = useState(false)
  const [sortBy, setSortBy] = useState<string>('popular')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])

  // Fetch all products to get available platforms and genres
  const { data: allProductsData } = useQuery({
    queryKey: ['all-products'],
    queryFn: async () => {
      const response = await api.get('/store/products', {
        params: {
          fields: 'metadata,collection,title',
          limit: 1000,
        }
      })
      return response.data.products
    },
  })

  // Extract unique platforms and genres
  useEffect(() => {
    if (allProductsData) {
      const uniquePlatforms = new Set<string>()
      const uniqueGenres = new Set<string>()

      allProductsData.forEach((product: any) => {
        if (product.metadata?.platform) {
          uniquePlatforms.add(product.metadata.platform)
        }
        if (product.collection?.handle) {
          uniqueGenres.add(product.collection.handle)
        }
      })

      setPlatforms(Array.from(uniquePlatforms).sort())
      setGenres(Array.from(uniqueGenres).sort())
    }
  }, [allProductsData])

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

  // Fetch products with pagination and filters
  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, limit, platform, genre, priceMin, priceMax, sortBy],
    queryFn: async () => {
      const response = await api.get('/store/products', {
        params: {
          fields: 'id,title,handle,description,thumbnail,*variants,*variants.prices,metadata,collection',
          limit: 1000, // Get all products for filtering
          offset: 0,
        }
      })
      let products = response.data.products || []

      // Filter out products with no price or zero price
      products = products.filter((p: any) => {
        const price = p.variants?.[0]?.prices?.[0]?.amount || 0
        return price > 0
      })

      // Apply filters
      if (platform !== 'all') {
        products = products.filter((p: any) => p.metadata?.platform === platform)
      }
      if (genre !== 'all') {
        products = products.filter((p: any) => p.collection?.handle === genre)
      }
      
      // Apply price range filter (convert to selected currency)
      products = products.filter((p: any) => {
        const variantPrices = p.variants?.[0]?.prices || []
        const currencyPrice = variantPrices.find((price: any) => 
          price.currency_code === selectedCurrency.code.toLowerCase()
        )
        const defaultPrice = variantPrices.find((price: any) => price.currency_code === 'usd')
        const price = currencyPrice || defaultPrice
        const priceInCurrency = (price?.amount || 0) / 100
        
        // Convert price to selected currency if needed
        let convertedPrice = priceInCurrency
        if (!currencyPrice && defaultPrice && selectedCurrency.rate) {
          convertedPrice = (defaultPrice.amount / 100) * selectedCurrency.rate
        }
        
        return convertedPrice >= priceMin && convertedPrice <= priceMax
      })

      // Apply sorting
      if (sortBy === 'low-high') {
        products.sort((a: any, b: any) => {
          const priceA = a.variants?.[0]?.prices?.[0]?.amount || 0
          const priceB = b.variants?.[0]?.prices?.[0]?.amount || 0
          return priceA - priceB
        })
      } else if (sortBy === 'high-low') {
        products.sort((a: any, b: any) => {
          const priceA = a.variants?.[0]?.prices?.[0]?.amount || 0
          const priceB = b.variants?.[0]?.prices?.[0]?.amount || 0
          return priceB - priceA
        })
      } else if (sortBy === 'a-z') {
        products.sort((a: any, b: any) => a.title.localeCompare(b.title))
      } else if (sortBy === 'newest') {
        products.sort((a: any, b: any) => {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return dateB - dateA
        })
      }

      // Apply pagination after filtering and sorting
      const totalCount = products.length
      const skip = (page - 1) * limit
      const paginatedProducts = products.slice(skip, skip + limit)

      return {
        products: paginatedProducts,
        count: totalCount,
      }
    },
    enabled: !!allProductsData,
  })

  const products = data?.products || []
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a1d24] to-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            ALL GAMES
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
          <p className="text-gray-400 text-lg">Explore our complete collection of digital game keys</p>
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
                <option value="all">Platform: All</option>
                {platforms.map(p => (
                  <option key={p} value={p}>Platform: {p}</option>
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
                <option value="all">Genre: All</option>
                {genres.map(g => (
                  <option key={g} value={g}>Genre: {g}</option>
                ))}
              </select>
              <div className="relative price-filter-container">
                <button 
                  onClick={() => setShowPriceFilter(!showPriceFilter)}
                  className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] hover:text-white transition text-sm font-semibold"
                >
                  Price: {selectedCurrency.symbol}{priceMin} - {selectedCurrency.symbol}{priceMax}
                </button>
                
                {showPriceFilter && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-[#1a1d24] border border-gray-700 rounded-lg p-6 shadow-xl z-50 price-filter-container">
                    <div className="mb-4">
                      <label className="text-white text-sm font-semibold mb-2 block">Price Range ({selectedCurrency.code})</label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-gray-400 text-xs mb-1 block">Min ({selectedCurrency.symbol})</label>
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
                          <label className="text-gray-400 text-xs mb-1 block">Max ({selectedCurrency.symbol})</label>
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
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] focus:border-[#ff6b35] focus:outline-none text-sm font-semibold"
            >
              <option value="popular">Sort: Popular</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
              <option value="a-z">Name: A-Z</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card">
                <div className="bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse h-56" />
                <div className="p-5 space-y-3">
                  <div className="h-6 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😕</div>
            <h3 className="text-2xl font-bold mb-2">Failed to load products</h3>
            <p className="text-gray-600 mb-6">Please try again later or check your connection.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        ) : !data || products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold mb-2">No products available</h3>
            <p className="text-gray-600 mb-6">Check back soon for new games!</p>
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
                    Ürün sayısı:
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
                    <option value={25}>25</option>
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
                    ← Önceki
                  </button>
                  <span className="text-white px-4">
                    Sayfa {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki →
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
