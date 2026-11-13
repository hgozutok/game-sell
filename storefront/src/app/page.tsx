'use client'

import Hero from '@/components/home/Hero'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import HomeSlider from '@/components/home/HomeSlider'
import ProductCollection from '@/components/home/ProductCollection'
import Link from 'next/link'
import { useT } from '@/components/useT'

export default function Home() {
  const t = useT()

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <Hero />

      {/* Hero Slider */}
      <section className="container mx-auto px-4 py-8">
        <HomeSlider />
      </section>

      <FeaturedCategories />

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-8">
        <ProductCollection
          title={t('home.featured')}
          filter="featured"
          viewAllLink="/products?filter=featured"
        />
      </section>

      {/* Discounted Products */}
      <section className="container mx-auto px-4 py-8">
        <ProductCollection
          title={t('home.hotDeals')}
          filter="discounted"
          viewAllLink="/deals"
        />
      </section>

      {/* Best Sellers */}
      <section className="container mx-auto px-4 py-8">
        <ProductCollection
          title={t('home.bestSellers')}
          filter="bestsellers"
          viewAllLink="/products?filter=bestsellers"
        />
      </section>

      {/* New Arrivals */}
      <section className="container mx-auto px-4 py-8">
        <ProductCollection
          title={t('home.newReleases')}
          filter="new"
          viewAllLink="/products?filter=new"
        />
      </section>

      {/* Special Offer Banner */}
      <section className="container mx-auto px-4 py-8">
        <div className="relative bg-gradient-to-r from-purple-900 via-pink-900 to-red-900 rounded-2xl overflow-hidden p-8 md:p-12">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff6b35] rounded-full filter blur-[100px]"></div>
          </div>
          <div className="relative z-10 text-center md:text-left">
            <div className="inline-block mb-4 px-4 py-1 bg-[#ff6b35] text-white text-xs font-bold rounded-full">
              {t('home.offerBadge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              {t('home.offerTitle')}
            </h2>
            <p className="text-xl text-gray-300 mb-6">
              {t('home.offerDesc')}
            </p>
            <Link href="/deals" className="btn-primary inline-block">
              {t('home.offerCta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-12 text-white">
          {t('home.whyTitle')}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="gaming-card p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-[#ff6b35]/30">
              ⚡
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{t('home.why1Title')}</h3>
            <p className="text-gray-400 leading-relaxed">
              {t('home.why1Desc')}
            </p>
          </div>
          <div className="gaming-card p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-green-500/30">
              💰
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{t('home.why2Title')}</h3>
            <p className="text-gray-400 leading-relaxed">
              {t('home.why2Desc')}
            </p>
          </div>
          <div className="gaming-card p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-blue-500/30">
              🛡️
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{t('home.why3Title')}</h3>
            <p className="text-gray-400 leading-relaxed">
              {t('home.why3Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="container mx-auto px-4 py-12">
        <div className="bg-[#15171c] border border-gray-800 rounded-2xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">100K+</div>
              <div className="text-sm text-gray-500 uppercase">{t('home.statsGames')}</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">500K+</div>
              <div className="text-sm text-gray-500 uppercase">{t('home.statsCustomers')}</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">24/7</div>
              <div className="text-sm text-gray-500 uppercase">{t('home.statsSupport')}</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">4.8★</div>
              <div className="text-sm text-gray-500 uppercase">{t('home.statsRating')}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
