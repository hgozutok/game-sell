'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import ProductCard from './ProductCard'

export default function ProductGrid() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', page, limit],
    queryFn: async () => {
      // Use Medusa's built-in products endpoint with limit and offset
      const response = await api.get('/store/products', {
        params: {
          fields: 'id,title,handle,description,thumbnail,*variants,*variants.prices,metadata',
          limit: limit,
          offset: (page - 1) * limit,
        }
      })
      // Filter out products with no price or zero price
      const products = (response.data.products || []).filter((product: any) => {
        const price = product.variants?.[0]?.prices?.[0]?.amount || 0
        return price > 0
      })
      
      return {
        products,
        count: products.length,
      }
    },
  })

  const products = data?.products || []
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  if (isLoading) {
    return (
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
    )
  }

  if (error) {
    return (
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
    )
  }

  if (!data || products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-2xl font-bold mb-2">No products available</h3>
        <p className="text-gray-600 mb-6">Check back soon for new games!</p>
      </div>
    )
  }

  return (
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
  )
}

