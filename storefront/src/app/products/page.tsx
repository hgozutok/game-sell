import ProductGrid from '@/components/products/ProductGrid'

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1a1d24] to-[#15171c] border-b border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">
            ALL GAMES
          </h1>
          <div className="w-20 h-1 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] mb-4"></div>
          <p className="text-gray-400 text-lg">Explore our complete collection of digital game keys</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {/* Filters Bar */}
        <div className="bg-[#15171c] border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] hover:text-white transition text-sm font-semibold">
                Platform: All
              </button>
              <button className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] hover:text-white transition text-sm font-semibold">
                Genre: All
              </button>
              <button className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] hover:text-white transition text-sm font-semibold">
                Price Range
              </button>
            </div>
            <select className="px-4 py-2 bg-[#1a1d24] border border-gray-700 text-gray-300 rounded-lg hover:border-[#ff6b35] focus:border-[#ff6b35] focus:outline-none text-sm font-semibold">
              <option>Sort: Popular</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Name: A-Z</option>
              <option>Newest First</option>
            </select>
          </div>
        </div>

        <ProductGrid />
      </div>
    </div>
  )
}
