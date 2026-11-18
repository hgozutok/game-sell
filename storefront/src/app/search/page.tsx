'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import ProductCard from '@/components/products/ProductCard'
import { usePriceCap } from '@/hooks/usePriceCap'
import Link from 'next/link'
import { useT } from '@/components/useT'

function SearchPageContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { cap, ready: priceCapReady, isOverCap } = usePriceCap()
  const query = searchParams.get('q') || ''
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const pageFromUrl = Math.max(1, Number(searchParams.get('page')) || 1)
  const [page, setPage] = useState(pageFromUrl)
  const [limit, setLimit] = useState(24)

  // Sayfa numarasi URL'de tutulur: yenileme / geri-ileri / paylasimda korunur.
  const changePage = useCallback(
    (next: number) => {
      const safe = Math.max(1, next)
      setPage(safe)
      const params = new URLSearchParams(searchParams.toString())
      if (safe > 1) params.set('page', String(safe))
      else params.delete('page')
      router.replace(`/search?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  useEffect(() => {
    setPage(pageFromUrl)
  }, [pageFromUrl])

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Yeni aramada sayfa 1'e donme isini URL yurutur: header yeni sorguya
  // gecerken page parametresini gondermez, pageFromUrl=1 olur.

  // Arama tamamiyle sunucu tarafinda sayfalanir: tum sonuc seti inmez.
  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, page, limit, cap],
    queryFn: async () => {
      const response = await api.get('/store/products/search', {
        params: {
          q: debouncedQuery,
          limit,
          offset: (page - 1) * limit,
        },
      })

      let products = response.data.products || []

      // fiyatsiz/stoksuz gizleme artik backend'de kayitli filtre ayarlarina gore yapilir
      // (catalog.hide_zero_price / catalog.hide_zero_stock)

      // Admin tarafinda belirlenen listeleme ust fiyat limiti (EUR)
      if (cap > 0) {
        products = products.filter((product: any) => !isOverCap(product))
      }

      return {
        products,
        count: response.data.count || 0,
      }
    },
    enabled: debouncedQuery.length >= 2 && priceCapReady,
  })

  const products = data?.products || []
  const count = data?.count || 0
  const totalPages = Math.ceil(count / limit)

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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-[#15171c] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <label htmlFor="searchPerPage" className="text-gray-400 text-sm">
                    {t('catalog.perPage')}
                  </label>
                  <select
                    id="searchPerPage"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      changePage(1)
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
                    onClick={() => changePage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('catalog.previous')}
                  </button>
                  <span className="text-white px-4">
                    {t('catalog.pageOf', { page, total: totalPages })}
                  </span>
                  <button
                    onClick={() => changePage(Math.min(totalPages, page + 1))}
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

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0b0d]" />}>
      <SearchPageContent />
    </Suspense>
  )
}
