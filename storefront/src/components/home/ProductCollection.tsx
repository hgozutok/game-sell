"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation } from "swiper/modules"
import ProductCard from "@/components/products/ProductCard"
import { api } from "@/lib/api"
import "swiper/css"
import "swiper/css/navigation"

interface Product {
  id: string
  title: string
  handle?: string
  thumbnail: string
  variants: Array<{
    id: string
    prices: Array<{
      amount: number
      currency_code: string
    }>
  }>
  metadata?: {
    platform?: string
    region?: string
    featured?: boolean
    bestseller?: boolean
  }
  created_at?: string
}

interface ProductCollectionProps {
  title: string
  filter: "featured" | "discounted" | "bestsellers" | "new"
  viewAllLink?: string
}

export default function ProductCollection({ title, filter, viewAllLink }: ProductCollectionProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let params: any = { limit: 12 }
        
        // Apply filters based on collection type
        switch (filter) {
          case "featured":
            // TODO: Filter by featured metadata when backend is ready
            break
          case "discounted":
            // TODO: Filter by discount when backend is ready
            break
          case "bestsellers":
            // TODO: Order by sales count when backend is ready
            break
          case "new":
            // Get recently added products
            params.order = "-created_at"
            break
        }

        // Add fields parameter to include variant pricing
        params.fields = '*variants,*variants.prices'
        
        const response = await api.get("/store/products", { params })
        
        if (response.data.products) {
          setProducts(response.data.products)
        }
      } catch (error) {
        console.error(`Failed to fetch ${filter} products:`, error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [filter])

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff6b35]"></div>
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return null
  }

  const sectionId = `collection-${filter}`

  return (
    <section className="py-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold text-white mb-2">{title}</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] rounded-full"></div>
        </div>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="text-[#ff6b35] hover:text-[#ff7b45] font-semibold flex items-center space-x-2 group"
          >
            <span>View All</span>
            <svg
              className="w-5 h-5 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        )}
      </div>

      {/* Products Carousel */}
      <div className="relative">
        <Swiper
          modules={[Navigation]}
          spaceBetween={24}
          slidesPerView={1}
          navigation={{
            nextEl: `#${sectionId}-next`,
            prevEl: `#${sectionId}-prev`,
          }}
          breakpoints={{
            640: {
              slidesPerView: 2,
            },
            1024: {
              slidesPerView: 3,
            },
            1280: {
              slidesPerView: 4,
            },
          }}
        >
          {products.map((product) => (
            <SwiperSlide key={product.id}>
              <ProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons */}
        <button
          id={`${sectionId}-prev`}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-12 h-12 bg-[#15171c] border-2 border-[#ff6b35] rounded-full flex items-center justify-center hover:bg-[#ff6b35] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          id={`${sectionId}-next`}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-12 h-12 bg-[#15171c] border-2 border-[#ff6b35] rounded-full flex items-center justify-center hover:bg-[#ff6b35] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  )
}

