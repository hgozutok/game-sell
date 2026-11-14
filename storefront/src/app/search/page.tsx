'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import ProductCard from '@/components/products/ProductCard'
import { usePriceCap } from '@/hooks/usePriceCap'
import Link from 'next/link'
import { useT } from '@/components/useT'

function SearchPageContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const { cap, ready: priceCapReady, isOverCap } = usePriceCap()
  const query = searchParams.get('q') || ''
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Fetch search results
  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, cap],
    queryFn: async () => {
      const response = await api.get('/store/products', {
        params: {
          fields: 'id,title,handle,description,thumbnail,*variants,*variants.prices,metadata',
          limit: 1000,
        }
      })
      
      let products = response.data.products || []
      
      // Filter out products with no price or zero price
      products = products.filter((product: any) => {
        const price = product.variants?.[0]?.prices?.[0]?.amount || 0
        return price > 0
      })
      
      // Admin tarafinda belirlenen listeleme ust fiyat limiti (EUR)
      if (cap > 0) {
        products = products.filter((product: any) => !isOverCap(product))
      }

      // Filter by search query
      if (debouncedQuery.length >= 2) {
        products = products.filter((product: any) =>
          product.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
          product.metadata?.platform?.toLowerCase().includes(debouncedQuery.toLowerCase())
        )
      }
      
      return {
        products,
        count: products.length,
      }
    },
    enabled: debouncedQuery.length >= 2 && priceCapReady,
  })

  const products = data?.products || []
  const count = data?.count || 0

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a1d24] to-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            {t('search.title')}
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
          {query && (
            <p className="text-gray-400 text-lg">
              {t('search.resultsFor')} <span className="text-[#ff6b35] font-bold">{query}</span>
            </p>
          )}
          {!query && (
            <p className="text-gray-400 text-lg">{t('search.enterTerm')}</p>
          )}
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Search Results */}
        {query.length < 2 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-2">{t('search.minCharsTitle')}</h3>
            <p className="text-gray-400 mb-6">{t('search.minCharsDesc')}</p>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="gaming-card">
                <div className="bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse h-56 rounded-t-xl" />
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
            <h3 className="text-2xl font-bold text-white mb-2">{t('search.failedTitle')}</h3>
            <p className="text-gray-400 mb-6">{t('search.failedDesc')}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn-primary"
            >
              {t('catalog.tryAgain')}
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-2">{t('search.noResults')}</h3>
            <p className="text-gray-400 mb-6">
              {t('search.noResultsDesc', { query })}
            </p>
            <Link href="/products" className="btn-primary">
              {t('search.browseAll')}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 text-gray-400">
              {t('search.found', { count })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0b0d]" />}>
      <SearchPageContent />
    </Suspense>
  )
}
