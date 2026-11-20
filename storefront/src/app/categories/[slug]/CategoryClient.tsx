'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '@/components/products/ProductCard'
import { usePriceCap } from '@/hooks/usePriceCap'
import { useT } from '@/components/useT'

interface ResolvedCategory {
  id: string
  title: string
  handle: string
  kind: 'collection' | 'category'
}

interface CategoryClientProps {
  initialProducts: any[]
  initialTotal: number
  category: ResolvedCategory
  slug: string
  currentPage: number
  currentSort: string
  currentPlatform: string
  perPage: number
}

function buildCategoryUrl(
  slug: string,
  updates: Record<string, string | number | undefined>,
  searchParams: URLSearchParams
): string {
  const next = new URLSearchParams(searchParams.toString())
  for (const [key, value] of Object.entries(updates)) {
    if (
      value === undefined ||
      value === '' ||
      value === 'all' ||
      (key === 'page' && Number(value) <= 1) ||
      (key === 'sort' && value === 'featured') ||
      (key === 'platform' && value === 'all')
    ) {
      next.delete(key)
    } else {
      next.set(key, String(value))
    }
  }
  const q = next.toString()
  return q ? `/categories/${slug}?${q}` : `/categories/${slug}`
}

export default function CategoryClient({
  initialProducts,
  initialTotal,
  category,
  slug,
  currentPage,
  currentSort,
  currentPlatform,
  perPage,
}: CategoryClientProps) {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const { isOverCap } = usePriceCap()

  const [sortBy, setSortBy] = useState(currentSort)
  const [filterPlatform, setFilterPlatform] = useState(currentPlatform)

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const url = buildCategoryUrl(slug, updates, searchParams)
    startTransition(() => {
      router.push(url, { scroll: true })
    })
  }

  // Cap filtresi (Admin tarafindan belirlenen azami fiyat limiti)
  let filteredProducts = initialProducts.filter((p: any) => !isOverCap(p))

  // Platform filtresi (istemci ici anlik filtreleme)
  if (filterPlatform !== 'all') {
    filteredProducts = filteredProducts.filter((p: any) => {
      const plat = (p.metadata?.platform || '').toLowerCase()
      return plat.includes(filterPlatform.toLowerCase())
    })
  }

  // Siralama
  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    const priceA = a.variants?.[0]?.calculated_price?.calculated_amount ?? a.variants?.[0]?.prices?.[0]?.amount ?? 0
    const priceB = b.variants?.[0]?.calculated_price?.calculated_amount ?? b.variants?.[0]?.prices?.[0]?.amount ?? 0

    if (sortBy === 'price-asc') return priceA - priceB
    if (sortBy === 'price-desc') return priceB - priceA
    if (sortBy === 'name') return (a.title || '').localeCompare(b.title || '')
    return 0 // featured
  })

  const totalPages = Math.max(1, Math.ceil(initialTotal / perPage))

  // Sayfalama dugmeleri hesaplama
  const getPaginationPages = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      if (start > 2) pages.push('ellipsis')
      for (let i = start; i <= end; i++) pages.push(i)
      if (end < totalPages - 1) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Filtre ve Siralama Bari */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-[#15171c] border border-gray-800 rounded-xl p-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Platform Filtresi (Tur sayfalarinda platform secmek icin) */}
          {category.kind === 'category' && (
            <div>
              <label htmlFor="categoryPlatform" className="text-gray-400 text-xs mb-1 block">
                {t('catalog.platform')}
              </label>
              <select
                id="categoryPlatform"
                value={filterPlatform}
                onChange={(e) => {
                  setFilterPlatform(e.target.value)
                  updateFilters({ platform: e.target.value, page: 1 })
                }}
                className="bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg text-sm focus:border-[#ff6b35] focus:outline-none"
              >
                <option value="all">{t('catalog.allPlatforms')}</option>
                <option value="steam">Steam</option>
                <option value="epic">Epic Games</option>
                <option value="origin">Origin</option>
                <option value="uplay">Uplay</option>
                <option value="gog">GOG</option>
                <option value="xbox">Xbox</option>
                <option value="playstation">PlayStation</option>
              </select>
            </div>
          )}

          {/* Siralama */}
          <div>
            <label htmlFor="categorySort" className="text-gray-400 text-xs mb-1 block">
              {t('catalog.sortBy')}
            </label>
            <select
              id="categorySort"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                updateFilters({ sort: e.target.value, page: 1 })
              }}
              className="bg-[#1a1d24] border border-gray-700 text-white px-4 py-2 rounded-lg text-sm focus:border-[#ff6b35] focus:outline-none"
            >
              <option value="featured">{t('catalog.featured')}</option>
              <option value="price-asc">{t('catalog.priceAsc')}</option>
              <option value="price-desc">{t('catalog.priceDesc')}</option>
              <option value="name">{t('catalog.nameAsc')}</option>
            </select>
          </div>
        </div>

        <div className="text-gray-500 text-sm">
          Toplam <span className="text-white font-bold">{initialTotal.toLocaleString('tr-TR')}</span> oyun
        </div>
      </div>

      {/* Urun Izgarasi */}
      <div className={`transition-opacity duration-200 ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        {sortedProducts.length === 0 ? (
          <div className="text-center py-16 bg-[#15171c] border border-gray-800 rounded-xl">
            <div className="text-6xl mb-4">🎮</div>
            <h3 className="text-2xl font-bold mb-2 text-white">
              {t('catalog.noProductsAvailable')}
            </h3>
            <p className="text-gray-400 mb-6">{t('catalog.checkBack')}</p>
            <Link href="/products" className="btn-primary inline-block">
              {t('catalog.allGamesTitle')}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Kalıcı Sayfalama */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-1 sm:gap-2 flex-wrap bg-[#15171c] border border-gray-800 rounded-xl p-6">
                {/* Onceki Sayfa */}
                {currentPage > 1 ? (
                  <Link
                    href={buildCategoryUrl(slug, { page: currentPage - 1 }, searchParams)}
                    rel="prev"
                    className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] hover:text-[#ff6b35] transition text-sm font-semibold"
                  >
                    {t('catalog.previous')}
                  </Link>
                ) : (
                  <span className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-800 text-gray-600 rounded-lg text-sm font-semibold cursor-not-allowed">
                    {t('catalog.previous')}
                  </span>
                )}

                {/* Sayfa Numaralari */}
                {getPaginationPages().map((p, idx) => {
                  if (p === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 py-2 text-gray-500 text-sm">
                        …
                      </span>
                    )
                  }

                  const isCurrent = p === currentPage
                  const pageUrl = buildCategoryUrl(slug, { page: p }, searchParams)

                  return isCurrent ? (
                    <span
                      key={p}
                      aria-current="page"
                      className="px-3 sm:px-4 py-2 bg-[#ff6b35] text-white rounded-lg text-sm font-bold shadow-md shadow-[#ff6b35]/20"
                    >
                      {p}
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={pageUrl}
                      className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] hover:text-white transition text-sm font-semibold"
                    >
                      {p}
                    </Link>
                  )
                })}

                {/* Sonraki Sayfa */}
                {currentPage < totalPages ? (
                  <Link
                    href={buildCategoryUrl(slug, { page: currentPage + 1 }, searchParams)}
                    rel="next"
                    className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-700 text-white rounded-lg hover:border-[#ff6b35] hover:text-[#ff6b35] transition text-sm font-semibold"
                  >
                    {t('catalog.next')}
                  </Link>
                ) : (
                  <span className="px-3 sm:px-4 py-2 bg-[#1a1d24] border border-gray-800 text-gray-600 rounded-lg text-sm font-semibold cursor-not-allowed">
                    {t('catalog.next')}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
