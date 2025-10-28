'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function CheckoutFailedPage() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'unknown'

  const errorMessages: Record<string, string> = {
    payment_failed: 'Your payment could not be processed. Please check your payment details and try again.',
    insufficient_funds: 'Your payment was declined due to insufficient funds.',
    card_declined: 'Your card was declined by your bank. Please try another payment method.',
    expired_card: 'Your card has expired. Please use a different card.',
    invalid_card: 'The card information provided is invalid.',
    timeout: 'The payment request timed out. Please try again.',
    unknown: 'An unexpected error occurred during payment processing.',
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Error Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-red-500 rounded-full mb-6">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-5xl font-black text-white mb-4">PAYMENT FAILED</h1>
            <p className="text-xl text-gray-300 mb-2">We couldn't process your payment</p>
          </div>

          {/* Error Details */}
          <div className="gaming-card p-8 mb-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="text-4xl">⚠️</div>
              <div>
                <h2 className="text-2xl font-black text-white mb-2">What went wrong?</h2>
                <p className="text-gray-300">{errorMessages[reason] || errorMessages.unknown}</p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-red-400 text-sm">
                <strong>Important:</strong> No charges have been made to your account. Your payment was not processed.
              </p>
            </div>
          </div>

          {/* What to do next */}
          <div className="gaming-card p-8 mb-6">
            <h2 className="text-2xl font-black text-white mb-6">💡 WHAT TO DO NEXT</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Check Your Payment Details</h3>
                  <p className="text-gray-400 text-sm">
                    Verify that your card number, expiry date, CVV, and billing address are correct.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Contact Your Bank</h3>
                  <p className="text-gray-400 text-sm">
                    If your card details are correct, contact your bank to ensure there are no restrictions on your
                    card.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Try Another Payment Method</h3>
                  <p className="text-gray-400 text-sm">
                    We accept multiple payment methods including PayPal, different cards, and bank transfers.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 bg-[#ff6b35] rounded-full flex items-center justify-center font-bold text-white">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Contact Our Support</h3>
                  <p className="text-gray-400 text-sm">
                    If the problem persists, our 24/7 support team is here to help you complete your purchase.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Payment Methods */}
          <div className="gaming-card p-8 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">💳 ALTERNATIVE PAYMENT METHODS</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">💳</div>
                <div className="text-sm text-gray-300">Credit Card</div>
              </div>
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🅿️</div>
                <div className="text-sm text-gray-300">PayPal</div>
              </div>
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🇪🇺</div>
                <div className="text-sm text-gray-300">Mollie</div>
              </div>
              <div className="bg-[#1a1d24] border border-gray-700 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">🏦</div>
                <div className="text-sm text-gray-300">Bank Transfer</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/checkout" className="btn-primary text-center">
              TRY AGAIN
            </Link>
            <Link href="/cart" className="btn-secondary text-center">
              BACK TO CART
            </Link>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 text-center">
            <h3 className="font-bold text-white mb-2">🆘 Need Immediate Assistance?</h3>
            <p className="text-gray-400 text-sm mb-4">
              Our support team is available 24/7 to help you complete your purchase.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="text-[#ff6b35] hover:underline font-semibold">
                Contact Support →
              </Link>
              <a href="mailto:support@digitalgamestore.com" className="text-[#ff6b35] hover:underline font-semibold">
                Email Us →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
