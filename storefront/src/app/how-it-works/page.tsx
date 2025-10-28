import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'

export const metadata = {
  title: 'How It Works | Digital Game Store',
  description: 'Learn how to purchase and activate your digital game keys in 3 easy steps.',
}

export default function HowItWorksPage() {
  return (
    <PolicyLayout title="How It Works" lastUpdated="October 27, 2025">
      <div className="space-y-12">
        <p className="text-gray-300 text-lg">
          Buying game keys from Digital Game Store is quick, easy, and secure. Follow these simple steps to start
          playing your favorite games in minutes!
        </p>

        {/* Steps */}
        <div className="space-y-8">
          {/* Step 1 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-[#ff6b35]/30">
              1
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">Browse & Select Your Game</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Explore our extensive catalog of over 100,000 games across all major platforms including Steam, Epic
                Games, PlayStation, Xbox, and more. Use our search and filter options to find exactly what you're
                looking for.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Check platform compatibility (Steam, Epic, Origin, etc.)</li>
                <li>Verify region restrictions before purchasing</li>
                <li>Read game descriptions and system requirements</li>
                <li>Compare prices and look for special deals</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-[#ff6b35]/30">
              2
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">Complete Your Purchase</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Add your selected games to the cart and proceed to checkout. We offer multiple secure payment methods
                for your convenience.
              </p>
              <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6 mb-4">
                <h3 className="text-xl font-bold text-white mb-3">Accepted Payment Methods:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">💳</div>
                    <div className="text-sm text-gray-300">Credit/Debit Cards</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">🅿️</div>
                    <div className="text-sm text-gray-300">PayPal</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="text-sm text-gray-300">Cryptocurrency</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">🏦</div>
                    <div className="text-sm text-gray-300">Bank Transfer</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">📱</div>
                    <div className="text-sm text-gray-300">Mobile Payments</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">🌍</div>
                    <div className="text-sm text-gray-300">And More!</div>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 text-sm">
                <strong className="text-white">Security:</strong> All transactions are encrypted with SSL technology and
                we never store your full payment details.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-[#ff6b35]/30">
              3
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">Receive & Activate Your Key</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Once payment is confirmed, you'll receive your game key instantly via email and in your account
                dashboard. Activation is quick and easy!
              </p>
              <div className="space-y-4">
                <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">📧 Email Delivery</h4>
                  <p className="text-gray-300 text-sm">
                    Check your inbox for an email containing your game key and activation instructions. Typically
                    arrives within 1-2 minutes.
                  </p>
                </div>
                <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">👤 Account Dashboard</h4>
                  <p className="text-gray-300 text-sm">
                    Log into your account and navigate to "My Orders" to view all your purchased keys anytime.
                  </p>
                </div>
                <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">🎮 Activation Instructions</h4>
                  <p className="text-gray-300 text-sm mb-3">Each platform has a simple activation process:</p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-300 text-sm">
                    <li>
                      <strong className="text-white">Steam:</strong> Games → Activate a Product on Steam → Enter Key
                    </li>
                    <li>
                      <strong className="text-white">Epic Games:</strong> Library → Redeem Code → Enter Key
                    </li>
                    <li>
                      <strong className="text-white">Origin:</strong> Redeem Product Code → Enter Key
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-12 pt-12 border-t border-gray-800">
          <h2 className="text-3xl font-bold text-white mb-6">Why Choose Us?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">Instant Delivery</h3>
              <p className="text-gray-300">
                Most keys are delivered within seconds of payment confirmation. No waiting, no delays.
              </p>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
              <div className="text-4xl mb-3">💯</div>
              <h3 className="text-xl font-bold text-white mb-2">Money-Back Guarantee</h3>
              <p className="text-gray-300">
                If your key doesn't work or you're not satisfied, we offer a full refund within 24 hours.
              </p>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">Secure Payments</h3>
              <p className="text-gray-300">
                All transactions are encrypted with SSL technology. Your payment information is always protected.
              </p>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-xl font-bold text-white mb-2">24/7 Support</h3>
              <p className="text-gray-300">
                Our customer support team is available around the clock to assist you with any issues.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] rounded-2xl p-8 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Get Started?</h2>
          <p className="text-white/90 text-lg mb-6">
            Browse our catalog of 100,000+ games and start playing today!
          </p>
          <Link href="/products" className="inline-block bg-white text-[#ff6b35] font-bold px-10 py-4 rounded-lg hover:bg-gray-100 transition uppercase tracking-wide text-lg">
            BROWSE GAMES NOW
          </Link>
        </div>
      </div>
    </PolicyLayout>
  )
}
