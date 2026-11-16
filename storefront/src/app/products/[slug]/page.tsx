import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductDetailClient from './ProductDetail'

const API_URL =
  process.env.MEDUSA_BACKEND_URL_SERVER || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ''
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// 78k urun icin SSG yerine ISR: saatte bir yenilenen sunucu tarafinda render
export const revalidate = 3600

interface ProductMeta {
  title: string
  handle: string
  description?: string | null
  thumbnail?: string | null
  images?: Array<{ url: string }>
  metadata?: {
    platform?: string
    region?: string
    genres?: string[]
    release_date?: string
    developer?: string
    publisher?: string
  }
  variants?: Array<{
    id: string
    prices?: Array<{ amount: number; currency_code: string }>
  }>
}

/** Sunucu tarafinda urunu handle ile ceker (ISR cache'li). */
async function fetchProductByHandle(handle: string): Promise<ProductMeta | null> {
  try {
    const res = await fetch(
      `${API_URL}/store/products?handle=${encodeURIComponent(handle)}&limit=1&fields=id,title,handle,description,thumbnail,metadata,*images,*variants,*variants.prices`,
      {
        headers: PUBLISHABLE_KEY ? { 'x-publishable-api-key': PUBLISHABLE_KEY } : {},
        next: { revalidate: 3600, tags: [`product-${handle}`] },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.products?.[0] || null
  } catch {
    return null
  }
}

/** HTML aciklamasini temizleyip meta description'a uygun hale getirir. */
function toDescription(text: string, max = 160): string {
  const clean = String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const { slug } = params
  const product = await fetchProductByHandle(slug)

  if (!product) {
    return {
      title: 'Ürün bulunamadı',
      robots: { index: false, follow: false },
    }
  }

  const meta = product.metadata || {}
  const bits = [meta.platform, meta.region].filter(Boolean) as string[]
  const base = toDescription(product.description || '')
  // Import'ta aciklama bos olan urunler icin kurulmus aciklama uret
  const fallback = `Buy ${product.title} digital game key${
    bits.length ? ` (${bits.join(', ')})` : ''
  } with instant email delivery. Best prices at HUPIPLAY.`
  const description = base || fallback
  const title = product.title

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/products/${product.handle}` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/products/${product.handle}`,
      images: product.thumbnail ? [{ url: product.thumbnail }] : undefined,
      siteName: 'HUPIPLAY',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.thumbnail ? [product.thumbnail] : undefined,
    },
    other: {
      'product:price:amount': String(
        (product.variants?.[0]?.prices?.find((p) => p.currency_code === 'usd')?.amount || 0) / 100
      ),
      'product:price:currency': 'USD',
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = params
  const product = await fetchProductByHandle(slug)
  if (!product) {
    notFound()
  }

  // JSON-LD: Product schema (Google zengin sonuclar)
  const price = product.variants?.[0]?.prices?.find((p) => p.currency_code === 'usd')
  const meta2 = product.metadata || {}
  const bits2 = [meta2.platform, meta2.region].filter(Boolean) as string[]
  const jsonLdDescription =
    toDescription(product.description || '') ||
    `Buy ${product.title} digital game key${bits2.length ? ` (${bits2.join(', ')})` : ''} with instant email delivery.`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: jsonLdDescription,
    image: [product.thumbnail, ...(product.images || []).map((i) => i.url)].filter(Boolean),
    sku: product.handle,
    category: product.metadata?.platform || undefined,
    brand: { '@type': 'Brand', name: 'HUPIPLAY' },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.handle}`,
      priceCurrency: 'USD',
      price: price ? (price.amount / 100).toFixed(2) : undefined,
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'HUPIPLAY' },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient />
    </>
  )
}
