'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Collection {
  id: string
  title: string
  handle: string
  created_at: string
  updated_at: string
}

export default function CategoriesPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await api.get('/store/collections')
        console.log('Collections response:', response.data)
        if (response.data.collections) {
          setCollections(response.data.collections)
        } else {
          console.warn('No collections in response:', response.data)
        }
      } catch (error: any) {
        console.error('Failed to fetch collections:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.config?.headers,
        })
        // Set empty array on error to avoid showing loading forever
        setCollections([])
      } finally {
        setLoading(false)
      }
    }

    fetchCollections()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            GAME CATEGORIES
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
          <p className="text-gray-400 text-lg">Explore games by your favorite genre</p>
        </div>
      </div>
      
      {/* Collections Grid */}
      <div className="container mx-auto px-4 py-12">
        {collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/categories/${collection.handle}`}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1d24] to-[#0a0b0d] border border-gray-800 hover:border-[#ff6b35] transition-all duration-300"
              >
                <div className="p-8">
                  <div className="relative z-10">
                    <div className="inline-block mb-4 px-3 py-1 bg-[#ff6b35]/20 backdrop-blur-sm rounded-full text-xs font-bold text-[#ff6b35]">
                      COLLECTION
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 group-hover:text-[#ff6b35] transition-colors">
                      {collection.title}
                    </h3>
                    <p className="text-gray-400 mb-6">Explore {collection.title} games</p>
                    <div className="inline-flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all">
                      EXPLORE
                      <span className="text-xl group-hover:text-[#ff6b35]">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-8xl mb-4 opacity-20">🎮</div>
            <h3 className="text-2xl font-bold text-white mb-2">No Categories Found</h3>
            <p className="text-gray-400 mb-6">Categories will appear here once products are imported</p>
            <Link href="/products" className="btn-primary">
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
