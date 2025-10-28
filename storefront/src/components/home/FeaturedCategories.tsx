import Link from 'next/link'

const categories = [
  { name: 'ACTION', icon: '⚔️', href: '/categories/action', count: '2,500+' },
  { name: 'RPG', icon: '🐉', href: '/categories/rpg', count: '1,800+' },
  { name: 'STRATEGY', icon: '🎯', href: '/categories/strategy', count: '1,200+' },
  { name: 'SPORTS', icon: '⚽', href: '/categories/sports', count: '900+' },
  { name: 'RACING', icon: '🏎️', href: '/categories/racing', count: '750+' },
  { name: 'ADVENTURE', icon: '🗺️', href: '/categories/adventure', count: '1,500+' },
]

export default function FeaturedCategories() {
  return (
    <section className="container mx-auto px-4 py-16">
      <div className="mb-10">
        <h2 className="text-3xl md:text-4xl font-black mb-2 text-white">
          BROWSE BY CATEGORY
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e]"></div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link
            key={category.name}
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
                <h3 className="font-bold text-white text-sm mb-1">{category.name}</h3>
                <p className="text-xs text-gray-500">{category.count} games</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
