'use client'

import ProductGrid from '@/components/products/ProductGrid'
import { useT } from '@/components/useT'
import Link from 'next/link'

export default function NewReleasesPage() {
  const t = useT()

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Epic Header */}
      <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff6b35] rounded-full filter blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full filter blur-[150px] animate-pulse"></div>
        </div>
        <div className="container mx-auto px-4 py-16 relative z-10 text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-[#ff6b35] text-white text-sm font-black rounded-full animate-pulse">
            🔥 {t('nav.newReleases')}
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4">
            {t('home.newReleases')}
          </h1>
          <p className="text-xl md:text-2xl text-blue-200 font-bold max-w-2xl mx-auto">
            {t('nav.newReleases')} — Instant digital game keys with email delivery. Best prices at HUPIPLAY.
          </p>
        </div>
      </div>

      {/* Breadcrumb Bar */}
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Link href="/" className="hover:text-[#ff6b35] transition">
              {t('nav.home') || 'Ana Sayfa'}
            </Link>
            <span>/</span>
            <span className="text-white font-medium">{t('nav.newReleases')}</span>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="container mx-auto px-4 py-12">
        <ProductGrid sortBy="newest" />
      </div>
    </div>
  )
}
