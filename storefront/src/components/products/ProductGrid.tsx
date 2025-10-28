'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import ProductCard from './ProductCard'

export default function ProductGrid() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get('/store/products', {
        params: {
          fields: '*variants,*variants.prices'
        }
      })
      return response.data.products
    },
  })

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

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🎮</div>
        <h3 className="text-2xl font-bold mb-2">No products available</h3>
        <p className="text-gray-600 mb-6">Check back soon for new games!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {data.map((product: any) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

