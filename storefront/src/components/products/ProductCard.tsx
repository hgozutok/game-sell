'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCurrencyStore } from '@/store/currencyStore'
import { useCartStore } from '@/store/cartStore'

interface ProductCardProps {
  product: {
    id: string
    title: string
    handle?: string
    description?: string
    thumbnail?: string
    variants?: Array<{
      id?: string
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
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency)
  const addItem = useCartStore((state) => state.addItem)
  const [amount, setAmount] = useState(0)
  const [addingToCart, setAddingToCart] = useState(false)
  
  // Use handle/slug for SEO-friendly URLs, fallback to ID
  const productUrl = product.handle || product.id

  // Get first variant ID
  const firstVariant = product.variants?.[0]
  const variantId = firstVariant?.id || product.id

  // Update price when currency changes
  useEffect(() => {
    const variantPrices = product.variants?.[0]?.prices || []
    const currencyPrice = variantPrices.find((p: any) => p.currency_code === selectedCurrency.code.toLowerCase())
    const defaultPrice = variantPrices.find((p: any) => p.currency_code === 'usd')
    const price = currencyPrice || defaultPrice
    setAmount(price?.amount || 0)
  }, [selectedCurrency.code, product.variants])

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!variantId) {
      alert('Bu ürün sepete eklenemiyor')
      return
    }

    setAddingToCart(true)
    
    addItem({
      id: product.id,
      variantId,
      productId: product.id,
      title: product.title,
      handle: product.handle || product.id,
      thumbnail: product.thumbnail || '',
      price: amount,
      currency: selectedCurrency.code,
      metadata: product.metadata,
    })
    
    setTimeout(() => {
      setAddingToCart(false)
    }, 300)
  }

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
          
          {/* Platform Badge */}
          {product.metadata?.platform && (
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-black/80 backdrop-blur-sm text-white border border-white/20 shadow-lg">
                {product.metadata.platform}
              </span>
            </div>
          )}

        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <h3 className="font-black text-white text-lg leading-snug mb-3 line-clamp-2 group-hover:text-[#ff6b35] transition-colors">
            {product.title }
          </h3>
          
          <p className="text-sm text-gray-400 mb-4 line-clamp-2 min-h-[40px] leading-relaxed">
            {product.description || "Digital game key delivered instantly"}
          </p>

          {/* Price and Action */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-auto">
            <div className="flex flex-col">
              {amount ? (
                <>
                  <div className="text-2xl font-black text-white leading-none">
                    {selectedCurrency.symbol}{(amount / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 line-through mt-1">
                    {selectedCurrency.symbol}{(amount / 100 * 1.4).toFixed(2)}
                  </div>
                </>
              ) : (
                <span className="text-gray-500 text-sm">Price not available</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Add to Cart Icon */}
              <button
                onClick={handleAddToCart}
                disabled={addingToCart || !variantId}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 ${
                  addingToCart
                    ? 'bg-green-500 scale-95 cursor-wait'
                    : 'bg-gradient-to-r from-[#ff6b35] to-[#f7931e] hover:scale-110'
                }`}
                title={addingToCart ? 'Ekleniyor...' : 'Sepete ekle'}
              >
                {addingToCart ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                )}
              </button>
              <button className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white px-5 py-2 rounded-md text-sm font-bold hover:shadow-lg hover:shadow-[#ff6b35]/50 transition-all uppercase group-hover:scale-105">
                BUY NOW
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
