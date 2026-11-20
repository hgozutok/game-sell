import type { Metadata } from 'next'
import { Suspense } from 'react'
import ProductsClient from './ProductsClient'

const API_URL =
  process.env.MEDUSA_BACKEND_URL_SERVER ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hupiplay.uk'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: {
    page?: string
    limit?: string
    platform?: string
    genre?: string
    sort?: string
    min?: string
    max?: string
  }
}

/** Dinamik SEO Metadata Uretimi */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1)
  const platform =
    searchParams.platform && searchParams.platform !== 'all' ? searchParams.platform : null
  const genre = searchParams.genre && searchParams.genre !== 'all' ? searchParams.genre : null

  let baseTitle = 'All Games — Buy Digital Game Keys'
  if (platform && genre) {
    baseTitle = `${platform} ${genre} Games`
  } else if (platform) {
    baseTitle = `${platform} Games`
  } else if (genre) {
    baseTitle = `${genre} Games`
  }

  const title = page > 1 ? `${baseTitle} (Page ${page}) | HUPIPLAY` : `${baseTitle} | HUPIPLAY`
  const canonical = page > 1 ? `${SITE_URL}/products?page=${page}` : `${SITE_URL}/products`

  const description = `Browse our extensive catalogue of digital game keys${
    platform ? ` for ${platform}` : ''
  }. Instant delivery, secure payments, and 24/7 support.`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'HUPIPLAY',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

/** Sunucu tarafinda platform ve tur fasetlerini ceker (1 saat ISR onbellekli) */
async function fetchFacets(): Promise<{ platforms: string[]; genres: string[] }> {
  try {
    const headers = PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : undefined
    const [colRes, catRes] = await Promise.all([
      fetch(`${API_URL}/store/collections?limit=100`, {
        headers,
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_URL}/store/product-categories?limit=100`, {
        headers,
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.json() : null)),
    ])

    const platforms = (colRes?.collections || [])
      .map((c: any) => c.title)
      .filter(Boolean)
      .sort()

    const genres = (catRes?.product_categories || [])
      .map((c: any) => c.name)
      .filter(Boolean)
      .sort()

    return { platforms, genres }
  } catch {
    return { platforms: [], genres: [] }
  }
}

/** Sunucu tarafinda filtrelenmis ve sayfalanmis urunleri ceker */
async function fetchProducts(params: {
  page: number
  limit: number
  platform?: string
  genre?: string
  sort?: string
  min?: number
  max?: number
}) {
  try {
    const headers = PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : undefined
    const offset = (params.page - 1) * params.limit

    const q = new URLSearchParams()
    q.set('limit', String(params.limit))
    q.set('offset', String(offset))

    if (params.platform && params.platform !== 'all') {
      q.set('platform', params.platform)
    }
    if (params.genre && params.genre !== 'all') {
      q.set('genre', params.genre)
    }
    if (params.sort && params.sort !== 'popular') {
      q.set('sort_by', params.sort)
    }
    if (params.min !== undefined && params.min > 0) {
      q.set('price_min', String(params.min))
    }
    if (params.max !== undefined && params.max < 1000) {
      q.set('price_max', String(params.max))
    }

    const res = await fetch(`${API_URL}/store/products/search?${q.toString()}`, {
      headers,
      cache: 'no-store', // Her sayfa/filtre istegi anlik gelsin
    })

    if (!res.ok) {
      return { products: [], count: 0 }
    }

    const data = await res.json()
    return {
      products: data.products || [],
      count: data.count || 0,
    }
  } catch (error) {
    console.error('[products/page] fetchProducts hatasi:', error)
    return { products: [], count: 0 }
  }
}

function ProductGridSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="gaming-card overflow-hidden">
            <div className="bg-gradient-to-br from-[#1a1d24] to-[#252a34] animate-pulse h-56" />
            <div className="p-5 space-y-3">
              <div className="h-6 bg-[#252a34] rounded animate-pulse" />
              <div className="h-4 bg-[#252a34] rounded animate-pulse w-3/4" />
              <div className="h-8 bg-[#252a34] rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1)
  const limitNum = parseInt(searchParams.limit || '20', 10)
  const limit = [20, 40, 80, 100].includes(limitNum) ? limitNum : 20
  const platform = searchParams.platform || 'all'
  const genre = searchParams.genre || 'all'
  const sort = searchParams.sort || 'popular'
  const min = searchParams.min ? Number(searchParams.min) : 0
  const max = searchParams.max ? Number(searchParams.max) : 1000

  // Paralel veri cekimi (Urunler + Fasetler)
  const [{ products, count }, { platforms, genres }] = await Promise.all([
    fetchProducts({ page, limit, platform, genre, sort, min, max }),
    fetchFacets(),
  ])

  // JSON-LD: ItemList Sema Verisi (Google Bot İndekslemesi)
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'All Games',
    numberOfItems: products.length,
    itemListElement: products.map((product: any, idx: number) => ({
      '@type': 'ListItem',
      position: (page - 1) * limit + idx + 1,
      name: product.title,
      url: `${SITE_URL}/products/${product.handle || product.id}`,
    })),
  }

  // JSON-LD: BreadcrumbList Sema Verisi
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Products',
        item: `${SITE_URL}/products`,
      },
      ...(page > 1
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: `Page ${page}`,
              item: `${SITE_URL}/products?page=${page}`,
            },
          ]
        : []),
    ],
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Schema.org Yapılandırılmış Verileri */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a1d24] to-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            All Games
            {page > 1 && (
              <span className="text-[#ff6b35] text-2xl md:text-3xl font-bold ms-3">
                (Page {page})
              </span>
            )}
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4" />
          <p className="text-gray-400 text-lg">
            Discover thousands of digital game keys with instant delivery
          </p>
        </div>
      </div>

      {/* Ana Urun Izgarasi ve Kalici Sayfalama */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductsClient
          initialProducts={products}
          initialCount={count}
          initialPlatforms={platforms}
          initialGenres={genres}
          currentPage={page}
          currentLimit={limit}
          currentPlatform={platform}
          currentGenre={genre}
          currentSort={sort}
          currentPriceMin={min}
          currentPriceMax={max}
        />
      </Suspense>
    </div>
  )
}
