'use client'

// Favoriler (wishlist) sayfasi — kaydedilen ürünler ProductCard ile listelenir.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useWishlistStore } from '@/store/wishlistStore'
import ProductCard from '@/components/products/ProductCard'
import { useT } from '@/components/useT'

export default function WishlistPage() {
  const t = useT()
  const productIds = useWishlistStore((state) => state.productIds)
  const remove = useWishlistStore((state) => state.remove)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      if (!productIds.length) {
        setProducts([])
        setLoading(false)
        return
      }
      try {
        const results = await Promise.all(
          productIds.map((id) =>
            api
              .get('/store/products/search', {
                params: {
                  id,
                  limit: 1,
                },
              })
              .then((res) => res.data?.products?.[0] || null)
              .catch(() => null)
          )
        )
        setProducts(results.filter(Boolean))
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    void fetchProducts()
  }, [productIds])

  const removeFromWishlist = (productId: string) => {
    remove(productId)
    setProducts((prev) => prev.filter((p) => p.id !== productId))
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">❤️ Favorilerim</h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-3"></div>
          <p className="text-gray-400">
            Beğendiğin oyunları buradan takip et, stok ve fiyat değişimlerini kaçırma.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-4 opacity-20">🤍</div>
            <h3 className="text-2xl font-bold text-white mb-2">Favori listen boş</h3>
            <p className="text-gray-400 mb-6">
              Ürün kartlarındaki kalp ikonuyla oyunları favorilerine ekleyebilirsin.
            </p>
            <Link href="/products" className="btn-primary">
              Oyunları Keşfet
            </Link>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-6">{products.length} ürün favorilerde</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="relative">
                  <ProductCard product={product} />
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="mt-2 w-full text-gray-400 hover:text-red-400 text-sm transition"
                  >
                    Favorilerden çıkar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
