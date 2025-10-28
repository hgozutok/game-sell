import FeaturedCategories from '@/components/home/FeaturedCategories'
import Link from 'next/link'

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="bg-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            GAME CATEGORIES
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
          <p className="text-gray-400 text-lg">Explore games by your favorite genre</p>
        </div>
      </div>
      
      <div className="py-8">
        <FeaturedCategories />
      </div>
      
      {/* Featured Category Banners */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/categories/popular" className="group relative overflow-hidden rounded-2xl">
            <div className="gaming-card p-10 bg-gradient-to-br from-blue-900 to-purple-900">
              <div className="relative z-10">
                <div className="inline-block mb-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">
                  TRENDING
                </div>
                <h3 className="text-3xl font-black text-white mb-3">🔥 POPULAR THIS WEEK</h3>
                <p className="text-blue-200 mb-6">The most played games right now</p>
                <div className="inline-flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all">
                  EXPLORE
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>
          
          <Link href="/categories/new" className="group relative overflow-hidden rounded-2xl">
            <div className="gaming-card p-10 bg-gradient-to-br from-emerald-900 to-cyan-900">
              <div className="relative z-10">
                <div className="inline-block mb-3 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">
                  NEW
                </div>
                <h3 className="text-3xl font-black text-white mb-3">🆕 NEW RELEASES</h3>
                <p className="text-emerald-200 mb-6">Latest games added to store</p>
                <div className="inline-flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all">
                  DISCOVER
                  <span className="text-xl">→</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
