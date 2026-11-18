'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useT } from '@/components/useT'

interface Collection {
  id: string
  title: string
  handle: string
  created_at: string
  updated_at: string
}

interface ProductCategory {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
  is_active: boolean
  is_internal: boolean
}

// Sayfa basina kart sayisi (4 kolon x 6 satir)
const PER_PAGE = 24

/** Dil bagimsiz sayfalama: ← 3 / 5 → */
function Pager({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  if (pages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="onceki-sayfa"
        className="px-4 py-2 rounded-lg border border-gray-700 bg-[#1a1d24] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#ff6b35] transition"
      >
        ←
      </button>
      <span className="text-sm text-gray-400 tabular-nums">
        {page} / {pages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(pages, page + 1))}
        disabled={page >= pages}
        aria-label="sonraki-sayfa"
        className="px-4 py-2 rounded-lg border border-gray-700 bg-[#1a1d24] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#ff6b35] transition"
      >
        →
      </button>
    </div>
  )
}

export default function CategoriesPage() {
  const t = useT()
  const [collections, setCollections] = useState<Collection[]>([])
  const [genres, setGenres] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [collectionPage, setCollectionPage] = useState(1)
  const [genrePage, setGenrePage] = useState(1)
  const collectionsRef = useRef<HTMLElement | null>(null)
  const genresRef = useRef<HTMLElement | null>(null)

  const gotoCollectionPage = (page: number) => {
    setCollectionPage(page)
    collectionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const gotoGenrePage = (page: number) => {
    setGenrePage(page)
    genresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Platform collections and genre categories come from two endpoints;
        // genres are Medusa product categories (many-to-many to products).
        const [collectionsResponse, categoriesResponse] = await Promise.all([
          api.get('/store/collections', { params: { limit: 100 } }),
          api.get('/store/product-categories', { params: { limit: 200 } }).catch(() => null),
        ])

        if (collectionsResponse.data.collections) {
          setCollections(collectionsResponse.data.collections)
          setCollectionPage(1)
        } else {
          console.warn('No collections in response:', collectionsResponse.data)
        }

        const allCategories: ProductCategory[] = categoriesResponse?.data?.product_categories || []
        setGenres(
          allCategories.filter(
            (c) => c.parent_category_id === null && c.is_active !== false && c.is_internal !== false
          )
        )
        setGenrePage(1)
      } catch (error: any) {
        console.error('Failed to fetch categories:', error)
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.config?.headers,
        })
        setCollections([])
        setGenres([])
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#ff6b35]"></div>
      </div>
    )
  }

  const isEmpty = collections.length === 0 && genres.length === 0

  const visibleCollections = collections.slice(
    (collectionPage - 1) * PER_PAGE,
    collectionPage * PER_PAGE
  )
  const visibleGenres = genres.slice((genrePage - 1) * PER_PAGE, genrePage * PER_PAGE)

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            {t('catalog.gameCategories')}
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
          <p className="text-gray-400 text-lg">{t('catalog.categoriesSubtitle')}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isEmpty ? (
          <div className="text-center py-20">
            <div className="text-8xl mb-4 opacity-20">🎮</div>
            <h3 className="text-2xl font-bold text-white mb-2">{t('catalog.noCategories')}</h3>
            <p className="text-gray-400 mb-6">{t('catalog.noCategoriesDesc')}</p>
            <Link href="/products" className="btn-primary">
              {t('catalog.browseAll')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-y-12">
            {collections.length > 0 && (
              <section ref={collectionsRef}>
                <h2 className="text-2xl font-black text-white mb-6">
                  {t('catalog.platforms')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {visibleCollections.map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/categories/${collection.handle}`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1d24] to-[#0a0b0d] border border-gray-800 hover:border-[#ff6b35] transition-all duration-300"
                    >
                      <div className="p-8">
                        <div className="relative z-10">
                          <div className="inline-block mb-4 px-3 py-1 bg-[#ff6b35]/20 backdrop-blur-sm rounded-full text-xs font-bold text-[#ff6b35]">
                            {t('catalog.collection')}
                          </div>
                          <h3 className="text-2xl font-black text-white mb-3 group-hover:text-[#ff6b35] transition-colors">
                            {collection.title}
                          </h3>
                          <p className="text-gray-400 mb-6">{t('catalog.exploreCollection')}</p>
                          <div className="inline-flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all">
                            {t('catalog.explore')}
                            <span className="text-xl group-hover:text-[#ff6b35]">→</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Pager
                  page={collectionPage}
                  total={collections.length}
                  onChange={gotoCollectionPage}
                />
              </section>
            )}

            {genres.length > 0 && (
              <section ref={genresRef}>
                <h2 className="text-2xl font-black text-white mb-6">
                  {t('catalog.genres')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {visibleGenres.map((genre) => (
                    <Link
                      key={genre.id}
                      href={`/categories/${genre.handle}`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1d24] to-[#0a0b0d] border border-gray-800 hover:border-[#ff6b35] transition-all duration-300"
                    >
                      <div className="p-8">
                        <div className="relative z-10">
                          <div className="inline-block mb-4 px-3 py-1 bg-[#f7931e]/20 backdrop-blur-sm rounded-full text-xs font-bold text-[#f7931e]">
                            {t('catalog.genre')}
                          </div>
                          <h3 className="text-2xl font-black text-white mb-3 group-hover:text-[#ff6b35] transition-colors">
                            {genre.name}
                          </h3>
                          <p className="text-gray-400 mb-6">{t('catalog.exploreGenre')}</p>
                          <div className="inline-flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all">
                            {t('catalog.explore')}
                            <span className="text-xl group-hover:text-[#ff6b35]">→</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <Pager page={genrePage} total={genres.length} onChange={gotoGenrePage} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
