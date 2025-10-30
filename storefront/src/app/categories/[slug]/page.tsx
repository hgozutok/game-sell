'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import ProductCard from '@/components/products/ProductCard'

interface Collection {
  id: string
  title: string
  handle: string
  created_at: string
  updated_at: string
}

interface Product {
  id: string
  title: string
  handle?: string
  thumbnail?: string
  variants: Array<{
    id: string
    calculated_price?: {
      calculated_amount: number
      currency_code: string
    }
    prices?: Array<{
      amount: number
      currency_code: string
    }>
  }>
  metadata?: {
    platform?: string
    region?: string
  }
}

export default function CategoryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [collection, setCollection] = useState<Collection | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('featured')
  const [filterPlatform, setFilterPlatform] = useState('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First, get all collections to find the one with matching handle
        const collectionsResponse = await api.get('/store/collections')
        const collections = collectionsResponse.data.collections || []
        
        // Find collection by handle
        const foundCollection = collections.find((col: Collection) => col.handle === slug)
        
        if (foundCollection) {
          setCollection(foundCollection)
          
          // Fetch products in this collection
          const productsResponse = await api.get(`/store/collections/${foundCollection.id}/products`, {
            params: {
              limit: 50,
            },
          })

          if (productsResponse.data.products) {
            setProducts(productsResponse.data.products)
          }
        }
      } catch (error) {
        console.error('Failed to fetch collection data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  // Filter and sort products
  // Note: Price and stock filtering should be done by backend API
  const filteredProducts = products.filter((product) => {
    // Filter by platform
    if (filterPlatform === 'all') return true
    return product.metadata?.platform?.toLowerCase() === filterPlatform.toLowerCase()
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') {
      const priceA = a.variants[0]?.calculated_price?.calculated_amount || a.variants[0]?.prices?.[0]?.amount || 0
      const priceB = b.variants[0]?.calculated_price?.calculated_amount || b.variants[0]?.prices?.[0]?.amount || 0
      return priceA - priceB
    }
    if (sortBy === 'price-desc') {
      const priceA = a.variants[0]?.calculated_price?.calculated_amount || a.variants[0]?.prices?.[0]?.amount || 0
      const priceB = b.variants[0]?.calculated_price?.calculated_amount || b.variants[0]?.prices?.[0]?.amount || 0
      return priceB - priceA
    }
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title)
    }
    return 0
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Breadcrumb */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-[#ff6b35] transition">
              Home
            </Link>
            <span className="text-gray-600">/</span>
            <Link href="/categories" className="text-gray-400 hover:text-[#ff6b35] transition">
              Categories
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-white font-semibold">{collection?.title || slug}</span>
          </div>
        </div>
      </div>

      {/* Category Header */}
      <div className="bg-gradient-to-br from-[#1a1d24] to-[#0a0b0d] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
              {collection?.title || slug.toUpperCase()}
            </h1>
            <p className="text-xl text-gray-400">Explore {collection?.title || slug} games</p>
            <div className="mt-6">
              <span className="text-[#ff6b35] font-bold text-lg">
                {products.length} {products.length === 1 ? 'Game' : 'Games'} Available
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap gap-4">
            {/* Platform Filter */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">PLATFORM</label>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="bg-[#15171c] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
              >
                <option value="all">All Platforms</option>
                <option value="steam">Steam</option>
                <option value="epic">Epic Games</option>
                <option value="origin">Origin</option>
                <option value="uplay">Uplay</option>
                <option value="gog">GOG</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="text-gray-400 text-sm mb-2 block">SORT BY</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#15171c] border border-gray-700 text-white px-4 py-2 rounded-lg focus:border-[#ff6b35] focus:outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button className="p-2 bg-[#ff6b35] text-white rounded-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Products Grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-8xl mb-4 opacity-20">🎮</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Products Found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your filters or check back later</p>
            <Link href="/products" className="btn-primary">
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
