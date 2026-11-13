'use client'

import Link from 'next/link'
import { useT } from '@/components/useT'

const categories = [
  { key: 'category.action', icon: '⚔️', href: '/categories/action', count: '2,500+' },
  { key: 'category.rpg', icon: '🐉', href: '/categories/rpg', count: '1,800+' },
  { key: 'category.strategy', icon: '🎯', href: '/categories/strategy', count: '1,200+' },
  { key: 'category.sports', icon: '⚽', href: '/categories/sports', count: '900+' },
  { key: 'category.racing', icon: '🏎️', href: '/categories/racing', count: '750+' },
  { key: 'category.adventure', icon: '🗺️', href: '/categories/adventure', count: '1,500+' },
]

export default function FeaturedCategories() {
  const t = useT()

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-10">
        <h2 className="text-3xl md:text-4xl font-black mb-2 text-white">
          {t('home.browseByCategory')}
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e]"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link
            key={category.key}
            href={category.href}
            className="group relative"
          >
            <div className="gaming-card p-6 text-center h-full">
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff6b35]/0 to-[#ff6b35]/0 group-hover:from-[#ff6b35]/10 group-hover:to-[#f7931e]/10 rounded-xl transition-all duration-300"></div>

              <div className="relative z-10">
                <div className="text-5xl mb-3 transform group-hover:scale-125 transition-transform duration-300 filter drop-shadow-2xl">
                  {category.icon}
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{t(category.key)}</h3>
                <p className="text-xs text-gray-500">{category.count} {t('home.gamesWord')}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
