import Hero from '@/components/home/Hero'
import FeaturedCategories from '@/components/home/FeaturedCategories'
import HomeSlider from '@/components/home/HomeSlider'
import ProductCollection from '@/components/home/ProductCollection'
import Link from 'next/link'

export default function Home() {
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
          title="⭐ Featured Games" 
          filter="featured"
          viewAllLink="/products?filter=featured"
        />
      </section>
      
      {/* Discounted Products */}
      <section className="container mx-auto px-4 py-8">
        <ProductCollection 
          title="🔥 Hot Deals" 
          filter="discounted"
          viewAllLink="/deals"
        />
      </section>
      
      {/* Best Sellers */}
      <section className="container mx-auto px-4 py-8">
        <ProductCollection 
          title="🏆 Best Sellers" 
          filter="bestsellers"
          viewAllLink="/products?filter=bestsellers"
        />
      </section>
      
      {/* New Arrivals */}
      <section className="container mx-auto px-4 py-8">
        <ProductCollection 
          title="🆕 New Releases" 
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
              LIMITED TIME OFFER
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
              SAVE UP TO 80% ON TOP TITLES
            </h2>
            <p className="text-xl text-gray-300 mb-6">
              Biggest sale of the season - Don't miss out!
            </p>
            <Link href="/deals" className="btn-primary inline-block">
              SHOP DEALS NOW
            </Link>
          </div>
        </div>
      </section>
      
      {/* Why Choose Us */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-12 text-white">
          WHY SHOP WITH US?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="gaming-card p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-[#ff6b35]/30">
              ⚡
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">INSTANT DELIVERY</h3>
            <p className="text-gray-400 leading-relaxed">
              Receive your game key instantly in your email. No waiting, no delays. 
              Start playing in minutes!
            </p>
          </div>
          <div className="gaming-card p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-green-500/30">
              💰
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">BEST PRICES</h3>
            <p className="text-gray-400 leading-relaxed">
              Compare prices across thousands of games. We guarantee the lowest prices 
              or your money back!
            </p>
          </div>
          <div className="gaming-card p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-blue-500/30">
              🛡️
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">100% SECURE</h3>
            <p className="text-gray-400 leading-relaxed">
              All transactions are encrypted and protected. Shop with complete confidence 
              and peace of mind.
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
              <div className="text-sm text-gray-500 uppercase">Games Available</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">500K+</div>
              <div className="text-sm text-gray-500 uppercase">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">24/7</div>
              <div className="text-sm text-gray-500 uppercase">Support</div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#ff6b35] mb-2">4.8★</div>
              <div className="text-sm text-gray-500 uppercase">Rating</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
