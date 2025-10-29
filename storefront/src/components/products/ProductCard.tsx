'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCurrencyStore } from '@/store/currencyStore'

interface ProductCardProps {
  product: {
    id: string
    title: string
    handle?: string
    description?: string
    thumbnail?: string
    variants?: Array<{
      calculated_price?: {
        calculated_amount?: number
        currency_code?: string
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
}

export default function ProductCard({ product }: ProductCardProps) {
  const { selectedCurrency } = useCurrencyStore()
  
  // Find price for selected currency
  const variantPrices = product.variants?.[0]?.prices || []
  const currencyPrice = variantPrices.find((p: any) => p.currency_code === selectedCurrency.code.toLowerCase())
  const defaultPrice = variantPrices.find((p: any) => p.currency_code === 'usd')
  
  const price = currencyPrice || defaultPrice
  const amount = price?.amount || 0
  
  // Use handle/slug for SEO-friendly URLs, fallback to ID
  const productUrl = product.handle || product.id

  return (
    <Link href={`/products/${productUrl}`} className="group block h-full">
      <div className="gaming-card h-full flex flex-col">
        {/* Image Container */}
        <div className="relative h-64 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden flex-shrink-0">
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized
              onError={(e) => console.error('Image load error:', product.thumbnail)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-7xl mb-2 opacity-50">🎮</div>
                <p className="text-gray-600 text-sm">No Image Available</p>
              </div>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#15171c] via-transparent to-transparent opacity-60"></div>
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <span className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              INSTANT DELIVERY
            </span>
          </div>
          
          {/* Platform Icons */}
          <div className="absolute top-3 right-3 flex gap-1">
            <div className="w-8 h-8 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center text-xs">
              🎮
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="font-bold text-white text-lg mb-2 line-clamp-2 group-hover:text-[#ff6b35] transition-colors min-h-[56px]">
            {product.title}
          </h3>
          
          <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
            {product.description || 'Digital game key delivered instantly'}
          </p>

          {/* Price and Action */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-auto">
            <div>
              {amount ? (
                <>
                  <div className="text-2xl font-black text-white">
                    {selectedCurrency.symbol}{(amount / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600 line-through">
                    {selectedCurrency.symbol}{(amount / 100 * 1.4).toFixed(2)}
                  </div>
                </>
              ) : (
                <span className="text-gray-500 text-sm">Price not available</span>
              )}
            </div>
            <button className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white px-5 py-2 rounded-md text-sm font-bold hover:shadow-lg hover:shadow-[#ff6b35]/50 transition-all uppercase group-hover:scale-105">
              BUY NOW
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
