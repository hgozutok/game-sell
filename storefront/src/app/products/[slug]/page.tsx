'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useCartStore } from '@/store/cartStore'
import { useCurrencyStore } from '@/store/currencyStore'
import { convertAmount, getCurrencySymbol } from '@/utils/currency'
import toast, { Toaster } from 'react-hot-toast'

interface Product {
  id: string
  title: string
  handle: string
  description: string
  thumbnail?: string
  images?: Array<{ url: string; id: string }>
  variants: Array<{
    id: string
    title?: string
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
    genre?: string
    release_date?: string
    developer?: string
    publisher?: string
    languages?: string[]
    badges?: string[]
    tags?: string[]
    provider?: string
    provider_image?: string
    provider_region_code?: string
  }
  display_price?: {
    amount: number
    amount_with_tax?: number
    currency_code: string
    tax_rate?: number
  }
  collection?: {
    title: string
    handle: string
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState(0)
  const [selectedImage, setSelectedImage] = useState(0)
  const [amount, setAmount] = useState(0)
  const currencies = useCurrencyStore((state) => state.currencies)
  const addItem = useCartStore((state) => state.addItem)
  const selectedCurrency = useCurrencyStore((state) => state.selectedCurrency)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Try to fetch by handle/slug first
        const response = await api.get(`/store/products`, {
          params: {
            handle: slug,
            fields: 'id,title,handle,description,metadata,*variants,*variants.prices,*images,*collection',
          },
        })

        if (response.data.products && response.data.products.length > 0) {
          setProduct(response.data.products[0])
        } else {
          // Fallback to fetch by ID if handle doesn't work
          const idResponse = await api.get(`/store/products/${slug}`, {
            params: {
              fields: 'id,title,handle,description,metadata,*variants,*variants.prices,*images,*collection',
            },
          })
          setProduct(idResponse.data.product)
        }
      } catch (error) {
        console.error('Failed to fetch product:', error)
        toast.error('Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [slug])

  // Update price when currency or variant changes
  useEffect(() => {
    if (!product) return
    
    const currentVariant = product.variants?.[selectedVariant]
    if (!currentVariant) return
    
    const variantPrices = currentVariant.prices || []
    const currencyPrice = variantPrices.find((p: any) => p.currency_code === selectedCurrency.code.toLowerCase())
    const defaultPrice = variantPrices.find((p: any) => p.currency_code === 'usd')

    if (product.display_price?.amount) {
      const converted = convertAmount(
        product.display_price.amount,
        product.display_price.currency_code || selectedCurrency.code,
        selectedCurrency.code,
        currencies
      )
      setAmount(converted)
      return
    }

    if (currencyPrice) {
      setAmount(currencyPrice.amount)
      return
    }

    if (defaultPrice) {
      const converted = convertAmount(
        defaultPrice.amount,
        defaultPrice.currency_code || 'usd',
        selectedCurrency.code,
        currencies
      )
      setAmount(converted)
      return
    }
    
    setAmount(0)
  }, [selectedCurrency.code, product, selectedVariant, currencies])

  const handleAddToCart = () => {
    if (!product) return

    const currentVariant = product.variants[selectedVariant]

    addItem({
      id: `${product.id}-${currentVariant.id}`,
      variantId: currentVariant.id,
      productId: product.id,
      title: product.title,
      handle: product.handle,
      thumbnail: product.thumbnail || '',
      price: amount, // Use the amount from state
      currency: selectedCurrency.code,
      metadata: product.metadata,
    })

    toast.success('Added to cart!', {
      icon: '🎮',
      style: {
        background: '#15171c',
        color: '#fff',
        border: '1px solid #ff6b35',
      },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-white mb-4">Product Not Found</h1>
          <Link href="/products" className="btn-primary">
            Browse Products
          </Link>
        </div>
      </div>
    )
  }

  const variant = product.variants[selectedVariant]
  const productTitle = product.title || product.handle || 'Game'
  const metadataImage =
    product.metadata?.provider === 'kinguin'
      ? product.metadata?.provider_image
      : undefined
  const baseImages =
    product.images && product.images.length > 0
      ? product.images
      : [{ url: product.thumbnail || '', id: '0' }]
  const images =
    metadataImage && product.metadata?.provider === 'kinguin'
      ? [{ url: metadataImage, id: 'provider-image' }, ...baseImages.filter((img) => img.url !== metadataImage)]
      : baseImages
  const regionMap: Record<string, string> = {
    'global': 'Global',
    'region free': 'Global',
    'region-free': 'Global',
    'worldwide': 'Worldwide',
    '1': 'Region 1 (US / Canada)',
    'region 1': 'Region 1 (US / Canada)',
    '2': 'Region 2 (Europe / Japan / Middle East)',
    'region 2': 'Region 2 (Europe / Japan / Middle East)',
    '3': 'Region 3 (Southeast Asia)',
    'region 3': 'Region 3 (Southeast Asia)',
    '4': 'Region 4 (Australia / New Zealand)',
    'region 4': 'Region 4 (Australia / New Zealand)',
    '5': 'Region 5 (South America / Africa / Russia)',
    'region 5': 'Region 5 (South America / Africa / Russia)',
  }

  const getReadableRegion = (region?: string) => {
    if (!region || typeof region !== 'string') {
      return region
    }
    const normalized = region.toLowerCase()
    return regionMap[normalized] || region
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <Toaster position="top-right" />

      {/* Breadcrumb */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
              <Link href="/" className="hover:text-[#ff6b35] transition">
                Home
              </Link>
              <span className="text-gray-600">/</span>
              <Link href="/products" className="hover:text-[#ff6b35] transition">
                Products
              </Link>
              {product.collection && (
                <>
                  <span className="text-gray-600">/</span>
                  <Link
                    href={`/categories/${product.collection.handle}`}
                    className="hover:text-[#ff6b35] transition"
                  >
                    {product.collection.title}
                  </Link>
                </>
              )}
              <span className="text-gray-600">/</span>
              <span className="text-white font-semibold">{productTitle}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white">{productTitle}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div>
            <div className="gaming-card mb-4 overflow-hidden">
              <div className="relative h-[500px] bg-gradient-to-br from-gray-800 to-gray-900">
                {images[selectedImage]?.url ? (
                  <Image
                    src={images[selectedImage].url}
                    alt={product.title || 'Product image'}
                    fill
                    className="object-cover"
                    priority
                    unoptimized
                    onError={(e) => console.error('Image load error:', images[selectedImage].url)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-9xl opacity-30">🎮</div>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(index)}
                    className={`gaming-card overflow-hidden ${
                      selectedImage === index ? 'ring-2 ring-[#ff6b35]' : ''
                    }`}
                  >
                    <div className="relative h-24">
                      {image.url ? (
                        <Image
                          src={image.url}
                          alt={`${product.title || 'Product image'} ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-4xl opacity-30">🎮</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-6">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{productTitle}</h2>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white text-sm font-bold px-4 py-1 rounded-full">
                  ⚡ INSTANT DELIVERY
                </span>
                {product.metadata?.platform && (
                  <span className="bg-[#1a1d24] border border-gray-700 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    {product.metadata.platform}
                  </span>
                )}
                {product.metadata?.region && (
                  <span className="bg-[#1a1d24] border border-gray-700 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    {getReadableRegion(product.metadata.region)}
                  </span>
                )}
                {product.metadata?.genre && (
                  <span className="bg-[#1a1d24] border border-gray-700 text-gray-300 text-sm px-4 py-1 rounded-full">
                    {product.metadata.genre}
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="gaming-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">PRICE</div>
                  <div className="text-4xl font-black text-white">
                    {getCurrencySymbol(selectedCurrency.code)}
                    {(amount / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 line-through">
                    {getCurrencySymbol(selectedCurrency.code)}
                    {((amount / 100) * 1.4).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-500 font-bold text-xl mb-1">-30%</div>
                  <div className="text-xs text-gray-500">You Save: {selectedCurrency.symbol}{((amount / 100) * 0.4).toFixed(2)}</div>
                </div>
              </div>

              {/* Variant Selection */}
              {product.variants.length > 1 && (
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">SELECT EDITION</div>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant, index) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(index)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                          selectedVariant === index
                            ? 'bg-[#ff6b35] text-white'
                            : 'bg-[#1a1d24] text-gray-300 hover:bg-[#ff6b35]/20'
                        }`}
                      >
                        {variant.title || `Option ${index + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              <button onClick={handleAddToCart} className="w-full btn-primary text-lg py-4">
                🛒 ADD TO CART
              </button>
            </div>

            {/* Provider Metadata */}
            {(product.metadata?.platform ||
              product.metadata?.region ||
              (product.metadata?.languages && product.metadata.languages.length > 0) ||
              (product.metadata?.badges && product.metadata.badges.length > 0) ||
              (product.metadata?.tags && product.metadata.tags.length > 0)) && (
              <div className="gaming-card p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">🌍 GAME DETAILS</h3>

                <div className="space-y-4 text-sm">
                  {product.metadata?.platform && (
                    <div>
                      <div className="text-gray-500 uppercase tracking-wider text-xs mb-1">Platform</div>
                      <div className="text-white font-semibold">{product.metadata.platform}</div>
                    </div>
                  )}

                  {product.metadata?.region && (
                    <div>
                      <div className="text-gray-500 uppercase tracking-wider text-xs mb-1">Region</div>
                      <div className="text-white font-semibold">{getReadableRegion(product.metadata.region)}</div>
                    </div>
                  )}

                  {product.metadata?.languages && product.metadata.languages.length > 0 && (
                    <div>
                      <div className="text-gray-500 uppercase tracking-wider text-xs mb-1">Languages</div>
                      <div className="flex flex-wrap gap-2">
                        {product.metadata.languages.map((language: string) => (
                          <span key={language} className="px-3 py-1 bg-[#1a1d24] text-gray-200 rounded-full border border-gray-700 text-xs font-semibold">
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.metadata?.badges && product.metadata.badges.length > 0 && (
                    <div>
                      <div className="text-gray-500 uppercase tracking-wider text-xs mb-1">Badges</div>
                      <div className="flex flex-wrap gap-2">
                        {product.metadata.badges.map((badge: string) => (
                          <span key={badge} className="px-3 py-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white rounded-full text-xs font-bold">
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.metadata?.tags && product.metadata.tags.length > 0 && (
                    <div>
                      <div className="text-gray-500 uppercase tracking-wider text-xs mb-1">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {product.metadata.tags.map((tag: string) => (
                          <span key={tag} className="px-3 py-1 bg-[#15171c] border border-gray-700 text-gray-300 rounded-full text-xs font-semibold">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Info */}
            {(product.metadata?.developer || product.metadata?.publisher || product.metadata?.release_date) && (
              <div className="gaming-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">📋 DETAILS</h3>
                <div className="space-y-2 text-sm">
                  {product.metadata?.developer && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Developer:</span>
                      <span className="text-white font-semibold">{product.metadata.developer}</span>
                    </div>
                  )}
                  {product.metadata?.publisher && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Publisher:</span>
                      <span className="text-white font-semibold">{product.metadata.publisher}</span>
                    </div>
                  )}
                  {product.metadata?.release_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Release Date:</span>
                      <span className="text-white font-semibold">{product.metadata.release_date}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-12">
            <div className="gaming-card p-8">
              <h2 className="text-3xl font-black text-white mb-6">📖 ABOUT THIS GAME</h2>
              <div className="text-gray-300 leading-relaxed whitespace-pre-line">{product.description}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
