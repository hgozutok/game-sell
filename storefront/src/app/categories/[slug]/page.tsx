import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import CategoryClient from './CategoryClient'

const API_URL =
  process.env.MEDUSA_BACKEND_URL_SERVER ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hupiplay.uk'

export const dynamic = 'force-dynamic'

const PER_PAGE = 20

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
    sort?: string
    platform?: string
  }>
}

interface ResolvedCategory {
  id: string
  title: string
  handle: string
  kind: 'collection' | 'category'
}

/** Sunucu tarafinda kategoriyi/koleksiyonu ve bagli urunleri ceker */
async function fetchCategoryData(slug: string, page: number) {
  const headers = PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : undefined
  const offset = (page - 1) * PER_PAGE

  try {
    // 1) Koleksiyon (Platform) kontrolu
    const collectionsRes = await fetch(`${API_URL}/store/collections?limit=100`, {
      headers,
      next: { revalidate: 3600 },
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null)

    const foundCol = (collectionsRes?.collections || []).find(
      (c: any) => c.handle?.toLowerCase() === slug.toLowerCase()
    )

    let category: ResolvedCategory | null = null

    if (foundCol) {
      category = {
        id: foundCol.id,
        title: foundCol.title,
        handle: foundCol.handle,
        kind: 'collection',
      }
    } else {
      // 2) Urun Kategorisi (Tur/Genre) kontrolu
      const catRes = await fetch(`${API_URL}/store/product-categories?limit=200`, {
        headers,
        next: { revalidate: 3600 },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null)

      const foundCat = (catRes?.product_categories || []).find(
        (c: any) => c.handle?.toLowerCase() === slug.toLowerCase()
      )

      if (foundCat) {
        category = {
          id: foundCat.id,
          title: foundCat.name,
          handle: foundCat.handle,
          kind: 'category',
        }
      }
    }

    if (!category) return null

    // 3) Urunleri cek
    const q = new URLSearchParams()
    q.set('limit', String(PER_PAGE))
    q.set('offset', String(offset))

    if (category.kind === 'collection') {
      q.set('collection_id', category.id)
    } else {
      q.set('category_id', category.id)
    }

    const searchRes = await fetch(`${API_URL}/store/products/search?${q.toString()}`, {
      headers,
      cache: 'no-store',
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null)

    const products = searchRes?.products || []
    const total = searchRes?.count || products.length

    return { category, products, total }
  } catch (error) {
    console.error(`[category/page] fetchCategoryData(${slug}) hatasi:`, error)
    return null
  }
}

/** Dinamik SEO Metadata */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const page = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1)
  const data = await fetchCategoryData(slug, page)

  if (!data || !data.category) {
    return {
      title: 'Kategori Bulunamadı | HUPIPLAY',
      robots: { index: false, follow: false },
    }
  }

  const { category } = data
  const baseTitle = `${category.title} Games`
  const title = page > 1 ? `${baseTitle} (Page ${page}) | HUPIPLAY` : `${baseTitle} | HUPIPLAY`
  const canonical = page > 1 ? `${SITE_URL}/categories/${slug}?page=${page}` : `${SITE_URL}/categories/${slug}`
  const description = `Buy ${category.title} digital game keys at best prices. Instant delivery via email with secure checkout at HUPIPLAY.`

  return {
    title,
    description,
    alternates: { canonical },
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
  }
}

function CategorySkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="gaming-card overflow-hidden">
            <div className="bg-gradient-to-br from-[#1a1d24] to-[#252a34] animate-pulse h-56" />
            <div className="p-5 space-y-3">
              <div className="h-6 bg-[#252a34] rounded animate-pulse" />
              <div className="h-4 bg-[#252a34] rounded animate-pulse w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const page = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1)
  const sort = resolvedSearchParams.sort || 'featured'
  const platform = resolvedSearchParams.platform || 'all'

  const data = await fetchCategoryData(slug, page)
  if (!data || !data.category) {
    notFound()
  }

  const { category, products, total } = data

  // JSON-LD: ItemList Sema Verisi
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.title} Games`,
    numberOfItems: products.length,
    itemListElement: products.map((product: any, idx: number) => ({
      '@type': 'ListItem',
      position: (page - 1) * PER_PAGE + idx + 1,
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
        name: 'Categories',
        item: `${SITE_URL}/categories`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: category.title,
        item: `${SITE_URL}/categories/${slug}`,
      },
      ...(page > 1
        ? [
            {
              '@type': 'ListItem',
              position: 4,
              name: `Page ${page}`,
              item: `${SITE_URL}/categories/${slug}?page=${page}`,
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

      {/* Breadcrumb Bar */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-3">
          <nav aria-label="Ekmek Kırıntısı" className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition">
              Home
            </Link>
            <span>/</span>
            <Link href="/categories" className="hover:text-white transition">
              Categories
            </Link>
            <span>/</span>
            <span className="text-white font-semibold">{category.title}</span>
            {page > 1 && <span className="text-[#ff6b35] font-semibold">(Page {page})</span>}
          </nav>
        </div>
      </div>

      {/* Category Header (SSR) */}
      <div className="bg-gradient-to-br from-[#1a1d24] to-[#0a0b0d] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
              {category.title}
              {page > 1 && (
                <span className="text-[#ff6b35] text-3xl md:text-4xl ms-3">
                  (Page {page})
                </span>
              )}
            </h1>
            <p className="text-xl text-gray-400">
              {category.kind === 'category'
                ? `Explore the best ${category.title} games with instant delivery`
                : `Explore games available on ${category.title}`}
            </p>
            <div className="mt-6">
              <span className="text-[#ff6b35] font-bold text-lg">
                {total.toLocaleString('tr-TR')} Games Available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Urun Izgarasi ve Kalici Sayfalama */}
      <Suspense fallback={<CategorySkeleton />}>
        <CategoryClient
          initialProducts={products}
          initialTotal={total}
          category={category}
          slug={slug}
          currentPage={page}
          currentSort={sort}
          currentPlatform={platform}
          perPage={PER_PAGE}
        />
      </Suspense>
    </div>
  )
}
