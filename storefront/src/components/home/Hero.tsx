import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-br from-[#1a1d24] via-[#15171c] to-[#0a0b0d] text-white py-20 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#ff6b35] rounded-full filter blur-[120px] opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full filter blur-[120px] opacity-20 animate-pulse"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-[#1a1d24] border border-[#ff6b35]/30 rounded-full">
            <span className="w-2 h-2 bg-[#ff6b35] rounded-full animate-pulse"></span>
            <span className="text-sm font-semibold text-[#ff6b35]">OVER 100,000+ GAMES AVAILABLE</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            BUY GAME KEYS
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b35] via-[#f7931e] to-[#ff6b35] animate-gradient">
              PLAY INSTANTLY
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            The best prices on PC, PlayStation, Xbox, and Nintendo games. 
            <span className="text-[#ff6b35] font-semibold"> Instant digital delivery</span> guaranteed.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/products" className="btn-primary group">
              SHOP NOW
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link href="/deals" className="btn-secondary">
              VIEW DEALS 🔥
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            <div className="bg-[#1a1d24] p-6 rounded-xl border border-gray-800">
              <div className="text-4xl mb-2">⚡</div>
              <div className="font-bold text-sm">INSTANT DELIVERY</div>
              <div className="text-xs text-gray-500">In Seconds</div>
            </div>
            <div className="bg-[#1a1d24] p-6 rounded-xl border border-gray-800">
              <div className="text-4xl mb-2">🔒</div>
              <div className="font-bold text-sm">SECURE PAYMENT</div>
              <div className="text-xs text-gray-500">SSL Protected</div>
            </div>
            <div className="bg-[#1a1d24] p-6 rounded-xl border border-gray-800">
              <div className="text-4xl mb-2">💯</div>
              <div className="font-bold text-sm">MONEY BACK</div>
              <div className="text-xs text-gray-500">Guaranteed</div>
            </div>
            <div className="bg-[#1a1d24] p-6 rounded-xl border border-gray-800">
              <div className="text-4xl mb-2">⭐</div>
              <div className="font-bold text-sm">24/7 SUPPORT</div>
              <div className="text-xs text-gray-500">Always Here</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
