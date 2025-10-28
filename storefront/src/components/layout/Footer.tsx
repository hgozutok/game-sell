import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#15171c] border-t border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-12">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-lg flex items-center justify-center text-2xl shadow-lg">
                🎮
              </div>
              <div>
                <h3 className="text-xl font-black text-white">DIGITAL KEYS</h3>
                <p className="text-xs text-gray-500">INSTANT DELIVERY</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md text-sm leading-relaxed">
              Your trusted marketplace for digital game keys. Over 100,000 games available with 
              instant delivery, secure payments, and the best prices guaranteed.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-[#1a1d24] hover:bg-[#ff6b35] rounded-lg flex items-center justify-center transition-all">
                <span className="text-sm">f</span>
              </a>
              <a href="#" className="w-10 h-10 bg-[#1a1d24] hover:bg-[#ff6b35] rounded-lg flex items-center justify-center transition-all">
                <span className="text-sm">𝕏</span>
              </a>
              <a href="#" className="w-10 h-10 bg-[#1a1d24] hover:bg-[#ff6b35] rounded-lg flex items-center justify-center transition-all">
                <span className="text-sm">in</span>
              </a>
              <a href="#" className="w-10 h-10 bg-[#1a1d24] hover:bg-[#ff6b35] rounded-lg flex items-center justify-center transition-all">
                <span className="text-sm">YT</span>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white uppercase text-sm">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="text-gray-400 hover:text-[#ff6b35] transition">All Games</Link></li>
              <li><Link href="/categories" className="text-gray-400 hover:text-[#ff6b35] transition">Categories</Link></li>
              <li><Link href="/deals" className="text-gray-400 hover:text-[#ff6b35] transition">Special Deals</Link></li>
              <li><Link href="/new-releases" className="text-gray-400 hover:text-[#ff6b35] transition">New Releases</Link></li>
              <li><Link href="/preorders" className="text-gray-400 hover:text-[#ff6b35] transition">Pre-orders</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white uppercase text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="text-gray-400 hover:text-[#ff6b35] transition">Help Center</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-[#ff6b35] transition">Contact Us</Link></li>
              <li><Link href="/faq" className="text-gray-400 hover:text-[#ff6b35] transition">FAQ</Link></li>
              <li><Link href="/returns" className="text-gray-400 hover:text-[#ff6b35] transition">Returns Policy</Link></li>
              <li><Link href="/how-it-works" className="text-gray-400 hover:text-[#ff6b35] transition">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white uppercase text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-gray-400 hover:text-[#ff6b35] transition">About Us</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-[#ff6b35] transition">Blog</Link></li>
              <li><Link href="/careers" className="text-gray-400 hover:text-[#ff6b35] transition">Careers</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-[#ff6b35] transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-[#ff6b35] transition">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <h4 className="text-white font-bold mb-4 text-sm uppercase">Accepted Payment Methods</h4>
          <div className="flex flex-wrap gap-3">
            {['VISA', 'MASTERCARD', 'PAYPAL', 'AMEX', 'CRYPTO'].map((method) => (
              <div key={method} className="bg-[#1a1d24] border border-gray-800 px-4 py-2 rounded-lg text-gray-400 text-xs font-bold">
                {method}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p className="text-gray-500">
              © {new Date().getFullYear()} Digital Game Store. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-gray-500">
              <span className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Secure Checkout
              </span>
              <span className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Instant Delivery
              </span>
              <span className="flex items-center gap-2">
                <span className="text-green-500">✓</span> Best Prices
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
