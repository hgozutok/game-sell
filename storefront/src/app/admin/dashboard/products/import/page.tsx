'use client'

import { useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'

interface ProviderProduct {
  productId: string
  name: string
  price: number
  quantity?: number
  qty?: number
}

export default function ProductImportPage() {
  const [provider, setProvider] = useState<'codeswholesale' | 'kinguin'>('codeswholesale')
  const [productIds, setProductIds] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [margin, setMargin] = useState(15)
  const [maxProducts, setMaxProducts] = useState(1000)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [searchResults, setSearchResults] = useState<ProviderProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobProgress, setJobProgress] = useState<number>(0)
  const [jobStatus, setJobStatus] = useState<string>('')

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearching(true)
    setSearchResults([])

    try {
      const response = await adminApi.get(`/admin/products/search`, {
        params: {
          provider,
          query: searchQuery,
        }
      })

      setSearchResults(response.data.products || [])
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Arama başarısız oldu'
      })
    } finally {
      setSearching(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  // Poll job status
  const pollJob = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await adminApi.get(`/admin/jobs/${jobId}`)
        const job = response.data.job

        setJobProgress(job.progress || 0)
        setJobStatus(`${job.processed_items || 0}/${job.total_items || 0} ürün işlendi`)

        if (job.status === 'completed') {
          clearInterval(pollInterval)
          setLoading(false)
          setJobId(null)
          setResult({
            success: true,
            message: `✅ ${job.result?.imported_count || 0} ürün başarıyla içe aktarıldı!`,
            details: `${job.result?.total_attempted || 0} ürün denendi.`
          })
        } else if (job.status === 'failed') {
          clearInterval(pollInterval)
          setLoading(false)
          setJobId(null)
          setResult({
            success: false,
            message: `❌ İçe aktarma başarısız: ${job.error}`
          })
        }
      } catch (error) {
        console.error('Job polling error:', error)
      }
    }, 2000) // Poll every 2 seconds
  }

  const handleImportAll = async () => {
    if (!confirm(`⚠️ ${provider.toUpperCase()} provider'dan TÜM STOKLU ÜRÜNLERİ arka planda içe aktarmak istediğinize emin misiniz?`)) {
      return
    }

    setLoading(true)
    setResult(null)
    setJobProgress(0)
    setJobStatus('Başlatılıyor...')

    try {
      const response = await adminApi.post('/admin/products/import-background', {
        provider,
        margin_percentage: margin,
        // Kinguin: yerel dump'tan listelenmemis urunler bu adet kadar cekilir
        max_products: provider === 'kinguin' ? maxProducts : Math.min(maxProducts, 100),
      })

      const newJobId = response.data.job_id
      setJobId(newJobId)
      setJobStatus('İmport başlatıldı, arka planda çalışıyor...')

      // Start polling
      pollJob(newJobId)
    } catch (error: any) {
      setLoading(false)
      setResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Toplu içe aktarma başlatılamadı'
      })
    }
  }

  const handleImport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    setLoading(true)
    setResult(null)

    // Get product IDs from either manual input or selected products
    const idsToImport = selectedProducts.length > 0 
      ? selectedProducts 
      : productIds.split(',').map(id => id.trim()).filter(Boolean)

    if (idsToImport.length === 0) {
      setResult({
        success: false,
        message: 'Lütfen içe aktarmak için ürün seçin veya ID girin'
      })
      setLoading(false)
      return
    }

    try {
      const response = await adminApi.post('/admin/products/import', {
        provider,
        product_ids: idsToImport,
        margin_percentage: margin,
      })

      setResult({
        success: true,
        message: `✅ ${response.data.imported_count || idsToImport.length} ürün başarıyla içe aktarıldı!`,
        products: response.data.imported_products
      })
      
      // Clear selections
      setSelectedProducts([])
      setSearchResults([])
      setSearchQuery('')
      setProductIds('')
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || error.message || 'İçe aktarma başarısız oldu'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-white">
              ← Geri
            </Link>
            <div>
              <h1 className="text-3xl font-black text-white">📦 Ürün İçe Aktarma</h1>
              <p className="text-gray-400">CWS ve Kinguin'den ürün getir</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Quick Import All Button */}
        <div className="mb-6 gaming-card p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-2 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">⚡ Hızlı Toplu İçe Aktarma</h3>
              <p className="text-sm text-gray-400">
                Seçili provider'dan tüm stoklu ürünleri tek tuşla içe aktarın
              </p>
            </div>
            <button
              onClick={handleImportAll}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? '⏳ İçe Aktarılıyor...' : '🚀 TÜM ÜRÜNLERİ İÇE AKTAR'}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {loading && jobId && (
          <div className="gaming-card p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">🔄 Arka Planda İçe Aktarılıyor...</h3>
              <span className="text-[#ff6b35] font-bold">{jobProgress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-4 mb-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#ff6b35] to-[#f7931e] h-4 transition-all duration-500 flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${jobProgress}%` }}
              >
                {jobProgress > 10 && `${jobProgress}%`}
              </div>
            </div>
            
            <p className="text-sm text-gray-400">{jobStatus}</p>
            
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-gray-400">
              💡 Sayfayı kapatabilirsiniz, import arka planda devam edecek
            </div>
          </div>
        )}

        {result && (
          <div className={`${result.success ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-red-500/10 border-red-500 text-red-500'} border px-4 py-3 rounded-lg mb-6`}>
            <div className="font-bold">{result.message}</div>
            {result.details && <div className="text-sm mt-1">{result.details}</div>}
          </div>
        )}

        <div className="gaming-card p-6">
          <form onSubmit={handleImport} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider Seçin
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setProvider('codeswholesale')
                    setSearchResults([])
                    setSelectedProducts([])
                  }}
                  className={`p-4 rounded-lg border-2 transition ${
                    provider === 'codeswholesale'
                      ? 'border-[#ff6b35] bg-[#ff6b35]/10'
                      : 'border-gray-700 bg-[#1a1d24]'
                  }`}
                >
                  <div className="text-3xl mb-2">🔑</div>
                  <div className="font-bold text-white">CodesWholesale</div>
                  <div className="text-xs text-gray-400">B2B marketplace</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProvider('kinguin')
                    setSearchResults([])
                    setSelectedProducts([])
                  }}
                  className={`p-4 rounded-lg border-2 transition ${
                    provider === 'kinguin'
                      ? 'border-[#ff6b35] bg-[#ff6b35]/10'
                      : 'border-gray-700 bg-[#1a1d24]'
                  }`}
                >
                  <div className="text-3xl mb-2">👑</div>
                  <div className="font-bold text-white">Kinguin</div>
                  <div className="text-xs text-gray-400">Game key platform</div>
                </button>
              </div>
            </div>

            {/* Product Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🔍 Ürün Ara (Provider'dan)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                  placeholder="Cyberpunk, GTA, FIFA, vb..."
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="px-6 py-3 bg-[#ff6b35] text-white rounded-lg font-bold hover:bg-[#ff7b45] transition disabled:opacity-50"
                >
                  {searching ? '⏳' : '🔍 Ara'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-3">
                  📋 Arama Sonuçları ({searchResults.length})
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {searchResults.map((product) => (
                    <label
                      key={product.productId}
                      className="flex items-center gap-3 p-3 bg-[#0a0b0d] rounded-lg cursor-pointer hover:border-[#ff6b35] border-2 border-transparent transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.productId)}
                        onChange={() => toggleProductSelection(product.productId)}
                        className="w-5 h-5 text-[#ff6b35] rounded"
                      />
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm">{product.name}</div>
                        <div className="text-xs text-gray-400">
                          ID: {product.productId} | Stock: {product.quantity || product.qty || 'N/A'}
                        </div>
                      </div>
                      <div className="text-[#ff6b35] font-bold">
                        ${(product.price || 0).toFixed(2)}
                      </div>
                    </label>
                  ))}
                </div>
                {selectedProducts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-sm text-white">
                      ✅ {selectedProducts.length} ürün seçildi
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual ID Input (Alternative) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ⌨️ veya Manuel Ürün ID Girin
              </label>
              <textarea
                value={productIds}
                onChange={(e) => setProductIds(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none font-mono text-sm"
                placeholder="PROD123, PROD456, PROD789"
                disabled={selectedProducts.length > 0}
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedProducts.length > 0 
                  ? '💡 Seçili ürünler var, manuel giriş devre dışı'
                  : 'Virgülle ayırarak birden fazla ID girin'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Kar Marjı (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="px-4 py-2 bg-[#1a1d24] border border-gray-700 rounded-lg text-white font-bold min-w-[80px] text-center">
                  %{margin}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Provider fiyatına eklenecek kar marjı
              </p>
            </div>

            {provider === 'kinguin' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  İçe Aktarım Adedi (Kinguin)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50000"
                  value={maxProducts}
                  onChange={(e) => setMaxProducts(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg focus:border-[#ff6b35] focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kinguin seçiliyken ürünler <b>yerel katalogdan</b> (API limiti yok) listelenmemiş
                  stoklu ürünlerden çekilir. 5.000+ değerleri arka planda uzun sürebilir.
                </p>
              </div>
            )}

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h4 className="text-sm font-bold text-white mb-2">📊 Fiyat Önizlemesi</h4>
              <div className="text-sm text-gray-400 space-y-1">
                <div>Provider Fiyatı: $50.00</div>
                <div>Kar Marjı (%{margin}): ${(50 * margin / 100).toFixed(2)}</div>
                <div className="text-[#ff6b35] font-bold">Satış Fiyatı: ${(50 + (50 * margin / 100)).toFixed(2)}</div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (selectedProducts.length === 0 && !productIds.trim())}
              className="w-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] text-white py-3 rounded-lg font-bold hover:shadow-2xl hover:shadow-[#ff6b35]/50 transition-all disabled:opacity-50"
            >
              {loading 
                ? '⏳ İçe Aktarılıyor...' 
                : `📥 ${selectedProducts.length > 0 ? `${selectedProducts.length} Ürünü` : 'Ürünleri'} İçe Aktar`}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 gaming-card p-6">
          <h3 className="text-lg font-bold text-white mb-3">ℹ️ Nasıl Kullanılır?</h3>
          <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
            <li>Provider seçin (CodesWholesale veya Kinguin)</li>
            <li>İçe aktarmak istediğiniz ürün ID'lerini girin</li>
            <li>Kar marjı yüzdesini belirleyin</li>
            <li>"İçe Aktar" butonuna tıklayın</li>
            <li>Ürünler otomatik olarak mağazanıza eklenecek</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

