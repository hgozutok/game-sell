import ProductGrid from '@/components/products/ProductGrid'

export default function DealsPage() {
  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Epic Header */}
      <div className="relative bg-gradient-to-r from-red-900 via-orange-900 to-yellow-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff6b35] rounded-full filter blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500 rounded-full filter blur-[150px] animate-pulse"></div>
        </div>
        <div className="container mx-auto px-4 py-16 relative z-10 text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-[#ff6b35] text-white text-sm font-black rounded-full animate-pulse">
            🔥 LIMITED TIME OFFERS 🔥
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4">
            MEGA DEALS
          </h1>
          <p className="text-2xl text-orange-200 font-bold mb-6">
            UP TO 80% OFF - LOWEST PRICES GUARANTEED
          </p>
        </div>
      </div>

      {/* Countdown Banner */}
      <div className="bg-[#15171c] border-y border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl">⏰</span>
              <div>
                <h3 className="font-black text-white text-xl">FLASH SALE ENDING SOON!</h3>
                <p className="text-sm text-gray-400">Don't miss these incredible savings</p>
              </div>
            </div>
            <div className="flex gap-4 font-mono text-3xl font-black text-white">
              <div className="text-center">
                <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-3 min-w-[80px]">23</div>
                <div className="text-xs text-gray-500 mt-1">HOURS</div>
              </div>
              <div className="text-[#ff6b35] text-4xl self-center">:</div>
              <div className="text-center">
                <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-3 min-w-[80px]">59</div>
                <div className="text-xs text-gray-500 mt-1">MINUTES</div>
              </div>
              <div className="text-[#ff6b35] text-4xl self-center">:</div>
              <div className="text-center">
                <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-3 min-w-[80px]">45</div>
                <div className="text-xs text-gray-500 mt-1">SECONDS</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <ProductGrid />
      </div>
    </div>
  )
}
