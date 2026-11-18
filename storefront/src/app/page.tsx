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

      {/* hupiesim.com — seyahat eSIM tanıtımı (kardeş marka) */}
      <section className="container mx-auto px-4 pt-8">
        <a
          href="https://hupiesim.com"
          target="_blank"
          rel="noopener noreferrer"
          className="group block relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-[#15171c] to-[#0a0b0d] p-6 sm:p-8 hover:border-emerald-400/60 transition"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div className="flex-1">
              <span className="inline-block mb-3 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400">
                {t('home.esimBadge')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 group-hover:text-emerald-300 transition-colors">
                {t('home.esimTitle')}
              </h2>
              <p className="text-gray-400 max-w-2xl">{t('home.esimDesc')}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 rounded-full bg-[#1a1d24] border border-gray-700 text-xs text-gray-300">
                  ✓ {t('home.esimFeature1')}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#1a1d24] border border-gray-700 text-xs text-gray-300">
                  ✓ {t('home.esimFeature2')}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#1a1d24] border border-gray-700 text-xs text-gray-300">
                  ✓ {t('home.esimFeature3')}
                </span>
              </div>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-[#0a0b0d] font-black group-hover:bg-emerald-400 transition">
                {t('home.esimCta')} ↗
              </span>
            </div>
          </div>
        </a>
      </section>

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">{t('home.statsGamesValue')}</div>
              <div className="text-sm text-gray-500 uppercase">{t('home.statsGames')}</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">{t('home.statsCustomersValue')}</div>
              <div className="text-sm text-gray-500 uppercase">{t('home.statsCustomers')}</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">24/7</div>
              <div className="text-sm text-gray-500 uppercase">{t('home.statsSupport')}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
