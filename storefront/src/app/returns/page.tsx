import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'

export const metadata = {
  title: 'Returns & Refunds Policy | Digital Game Store',
  description: 'Learn about our refund and returns policy for digital game keys.',
}

export default function ReturnsPage() {
  return (
    <PolicyLayout title="Returns & Refunds Policy" lastUpdated="October 27, 2025">
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">
            We understand that sometimes things don't go as planned. Our refund policy is designed to be fair to both
            our customers and our business, while complying with digital goods regulations.
          </p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Eligibility for Refunds</h2>
          <p className="mb-4">You may be eligible for a refund if:</p>
          <div className="space-y-3">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Invalid or Used Key:</strong>
                <p className="text-sm">The game key you received is invalid, already used, or doesn't work properly.</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Wrong Product:</strong>
                <p className="text-sm">We delivered a different game or edition than what you ordered.</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Region Incompatibility:</strong>
                <p className="text-sm">
                  The key is not compatible with your region despite being advertised as such.
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">Within 24 Hours & Unrevealed:</strong>
                <p className="text-sm">
                  You request a refund within 24 hours of purchase AND have not revealed or activated the key.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">When Refunds Are NOT Available</h2>
          <p className="mb-4">We cannot issue refunds in the following situations:</p>
          <div className="space-y-3">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">Key Already Activated:</strong>
                <p className="text-sm">The game key has been revealed, activated, or redeemed on any platform.</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">Changed Your Mind:</strong>
                <p className="text-sm">
                  You simply changed your mind or no longer want the game after revealing the key.
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">Technical Issues:</strong>
                <p className="text-sm">
                  Your computer doesn't meet the game's system requirements (always check before purchasing).
                </p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">Beyond Time Limit:</strong>
                <p className="text-sm">More than 24 hours have passed since purchase (for change of mind requests).</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">How to Request a Refund</h2>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">Step 1: Gather Information</h3>
              <p className="mb-2">Before requesting a refund, please have the following ready:</p>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Your order number</li>
                <li>Reason for the refund request</li>
                <li>Screenshots of any errors (if applicable)</li>
                <li>Proof that the key hasn't been activated (if claiming defective key)</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">Step 2: Contact Support</h3>
              <p className="mb-4">Submit your refund request through one of these methods:</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="btn-secondary">
                  Contact Form
                </Link>
                <a href="mailto:refunds@digitalgamestore.com" className="btn-secondary">
                  Email Support
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">Step 3: Wait for Review</h3>
              <p>
                Our support team will review your request within <strong className="text-white">24-48 hours</strong>.
                We'll contact you if we need any additional information.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Refund Processing Time</h2>
          <p className="mb-4">Once your refund is approved:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-white">Credit/Debit Cards:</strong> 3-5 business days
            </li>
            <li>
              <strong className="text-white">PayPal:</strong> 1-2 business days
            </li>
            <li>
              <strong className="text-white">Bank Transfer:</strong> 5-7 business days
            </li>
            <li>
              <strong className="text-white">Cryptocurrency:</strong> 24-48 hours
            </li>
          </ul>
          <p className="mt-4 text-sm">
            Note: The actual time for funds to appear in your account may vary depending on your financial institution.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Exchanges</h2>
          <p>
            Unfortunately, we do not offer direct exchanges for digital products. If you ordered the wrong game and are
            eligible for a refund, you can request a refund and then place a new order for the correct game.
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Disputed Charges</h2>
          <p className="mb-4">
            Before opening a dispute with your payment provider, please contact us directly. We're here to help resolve
            any issues and can often do so faster than a formal dispute process.
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-200">
              <strong>⚠️ Important:</strong> Opening a chargeback or dispute without contacting us first may result in
              your account being suspended and inability to make future purchases.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">Questions About Our Refund Policy?</h2>
          <p className="mb-4">
            If you have any questions about our refund policy or need clarification, please don't hesitate to reach
            out:
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="btn-primary">
              Contact Support
            </Link>
            <Link href="/faq" className="btn-secondary">
              Read FAQ
            </Link>
          </div>
        </section>

        <div className="mt-12 bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">💡 Pro Tips</h3>
          <div className="text-left max-w-2xl mx-auto space-y-2">
            <p>• Always check region compatibility before purchasing</p>
            <p>• Verify system requirements match your setup</p>
            <p>• Double-check your order before completing checkout</p>
            <p>• Contact support immediately if you receive a defective key</p>
            <p>• Keep your order confirmation email for reference</p>
          </div>
        </div>
      </div>
    </PolicyLayout>
  )
}
