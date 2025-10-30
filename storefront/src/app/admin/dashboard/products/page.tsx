'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

interface Product {
  id: string
  title: string
  handle?: string
  thumbnail?: string
  status: string
  collection_id?: string
  metadata?: {
    platform?: string
    provider?: string
    original_price?: number
  }
  variants?: Array<{
    prices?: Array<{
      amount: number
      currency_code: string
    }>
  }>
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    hideZeroPrice: true,
    hideZeroStock: true,
  })

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await adminApi.get('/admin/products', {
        params: {
          skip: (page - 1) * limit,
          take: limit,
          fields: '*variants,*variants.prices,collection_id,metadata',
          hideZeroPrice: filters.hideZeroPrice ? 'true' : 'false',
          hideZeroStock: filters.hideZeroStock ? 'true' : 'false',
        }
      })

      setProducts(response.data.products || [])
      const count = response.data.count || 0
      setTotalPages(Math.ceil(count / limit))
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load products')
      console.error('Products fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [page, limit, filters.hideZeroPrice, filters.hideZeroStock])

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      return
    }

    try {
      await adminApi.delete(`/admin/products/${productId}`)
      fetchProducts()
    } catch (err: any) {
      alert('Ürün silinirken hata oluştu: ' + (err?.response?.data?.message || err.message))
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white mb-1">
                📦 Ürün Yönetimi
              </h1>
              <p className="text-gray-400">Ürünleri görüntüle, düzenle ve yönet</p>
            </div>
            <Link 
              href="/admin/dashboard"
              className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition"
            >
              ← Geri
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="gaming-card p-6 mb-6">
          <h2 className="text-xl font-black text-white mb-4">Filtreler</h2>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hideZeroPrice"
                checked={filters.hideZeroPrice}
                onChange={(e) => setFilters({ ...filters, hideZeroPrice: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <label htmlFor="hideZeroPrice" className="text-white">
                Fiyatı 0 olan ürünleri gizle
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hideZeroStock"
                checked={filters.hideZeroStock}
                onChange={(e) => setFilters({ ...filters, hideZeroStock: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              <label htmlFor="hideZeroStock" className="text-white">
                Stokları 0 olan ürünleri gizle
              </label>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="limit" className="text-white">
                Sayfa başına:
              </label>
              <select
                id="limit"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-[#1a1d24] border border-gray-700 text-white px-3 py-2 rounded-lg"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-bold text-white mb-2">{error}</h3>
            <button
              onClick={fetchProducts}
              className="btn-primary mt-4"
            >
              Tekrar Dene
            </button>
          </div>
        ) : (
          <>
            <div className="gaming-card p-6 mb-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Görsel</th>
                      <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Ürün Adı</th>
                      <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Durum</th>
                      <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Platform</th>
                      <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">Fiyat</th>
                      <th className="text-left py-3 px-4 text-gray-400 text-sm font-bold">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const price = product.variants?.[0]?.prices?.[0]?.amount || 0
                      return (
                        <tr key={product.id} className="border-b border-gray-800 hover:bg-gray-800/20">
                          <td className="py-3 px-4">
                            {product.thumbnail ? (
                              <img
                                src={product.thumbnail}
                                alt={product.title}
                                className="w-16 h-16 object-cover rounded"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-700 rounded flex items-center justify-center">
                                🎮
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{product.title}</div>
                            {product.handle && (
                              <div className="text-xs text-gray-500">{product.handle}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              product.status === 'published' 
                                ? 'bg-green-500/20 text-green-500' 
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {product.status === 'published' ? 'Yayında' : 'Taslak'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-400 text-sm">
                              {product.metadata?.platform || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white">
                              ${(price / 100).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <a
                                href={`/products/${product.handle || product.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-blue-500/20 text-blue-500 rounded text-sm hover:bg-blue-500/30 transition"
                              >
                                Görüntüle
                              </a>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="px-3 py-1 bg-red-500/20 text-red-500 rounded text-sm hover:bg-red-500/30 transition"
                              >
                                Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-50"
                >
                  ← Önceki
                </button>
                <span className="text-white">
                  Sayfa {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] transition disabled:opacity-50"
                >
                  Sonraki →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

