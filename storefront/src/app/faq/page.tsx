'use client'

import { useState } from 'react'
import PolicyLayout from '@/components/layout/PolicyLayout'

const faqs = [
  {
    category: 'Orders & Delivery',
    questions: [
      {
        q: 'How do I receive my game key?',
        a: 'After completing your purchase, you will receive an email with your game key within minutes. You can also view your keys in your account under "My Orders".',
      },
      {
        q: 'How long does delivery take?',
        a: 'Most game keys are delivered instantly after payment confirmation. In rare cases, it may take up to 15 minutes during peak times.',
      },
      {
        q: "I didn't receive my key, what should I do?",
        a: 'First, check your spam/junk folder. If you still cannot find it, log into your account and check the "My Orders" section. If the issue persists, contact our support team.',
      },
    ],
  },
  {
    category: 'Payment & Pricing',
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Stripe, and various other payment methods depending on your region.',
      },
      {
        q: 'Are the prices shown in my local currency?',
        a: 'Yes, prices are automatically converted to your local currency based on your location. You can also manually select your preferred currency.',
      },
      {
        q: 'Do you offer discounts or promotions?',
        a: 'Yes! We regularly offer sales, seasonal promotions, and special deals. Subscribe to our newsletter to stay updated on the latest offers.',
      },
    ],
  },
  {
    category: 'Game Keys & Activation',
    questions: [
      {
        q: 'How do I activate my game key?',
        a: 'The activation process depends on the platform (Steam, Epic Games, etc.). Detailed instructions are included with your game key email.',
      },
      {
        q: 'Are your keys region-locked?',
        a: 'Some keys may be region-specific. The region restrictions are clearly displayed on the product page before purchase.',
      },
      {
        q: 'What if my key is invalid or already used?',
        a: 'If you receive an invalid key, please contact our support team immediately with your order number and screenshots of the error. We will resolve the issue promptly.',
      },
      {
        q: 'Can I use the key on multiple devices?',
        a: 'This depends on the game publisher and platform. Most keys can be used on one account but may allow installation on multiple devices linked to that account.',
      },
    ],
  },
  {
    category: 'Refunds & Returns',
    questions: [
      {
        q: 'What is your refund policy?',
        a: 'Refunds are available if the key is defective, invalid, or if you request within 24 hours before activation. Once a key is revealed or activated, refunds cannot be issued.',
      },
      {
        q: 'How long does a refund take?',
        a: 'Approved refunds are processed within 3-5 business days. The time it takes for the funds to appear in your account depends on your payment provider.',
      },
      {
        q: 'Can I exchange a game for a different one?',
        a: 'We do not offer exchanges. If you are eligible for a refund, you can request one and then purchase the correct game separately.',
      },
    ],
  },
  {
    category: 'Account & Security',
    questions: [
      {
        q: 'Do I need an account to make a purchase?',
        a: 'Yes, an account is required to track your orders and access your game keys. Creating an account is quick and free.',
      },
      {
        q: 'Is my payment information secure?',
        a: 'Absolutely. We use industry-standard SSL encryption for all transactions. We do not store your full payment details on our servers.',
      },
      {
        q: 'How do I reset my password?',
        a: 'Click on "Forgot Password" on the login page, enter your email address, and follow the instructions sent to your email.',
      },
    ],
  },
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  const toggleQuestion = (index: string) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <PolicyLayout title="Frequently Asked Questions" lastUpdated="October 27, 2025">
      <div className="space-y-8">
        <p className="text-gray-300 text-lg">
          Find answers to the most common questions about our service. If you can't find what you're looking for,
          please <a href="/contact" className="text-[#ff6b35] hover:underline">contact our support team</a>.
        </p>

        {faqs.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <h2 className="text-3xl font-bold text-white mb-6">{category.category}</h2>
            <div className="space-y-4">
              {category.questions.map((faq, faqIndex) => {
                const index = `${categoryIndex}-${faqIndex}`
                const isOpen = openIndex === index

                return (
                  <div
                    key={index}
                    className="bg-[#1a1d24] border border-gray-800 rounded-lg overflow-hidden hover:border-[#ff6b35]/50 transition"
                  >
                    <button
                      onClick={() => toggleQuestion(index)}
                      className="w-full text-left p-6 flex items-center justify-between gap-4"
                    >
                      <span className="font-bold text-white text-lg">{faq.q}</span>
                      <svg
                        className={`w-6 h-6 text-[#ff6b35] flex-shrink-0 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6">
                        <p className="text-gray-300 leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="mt-12 bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Still Have Questions?</h3>
          <p className="text-gray-300 mb-6">
            Our customer support team is available 24/7 to help you with any questions or issues.
          </p>
          <a href="/contact" className="btn-primary inline-block">
            Contact Support
          </a>
        </div>
      </div>
    </PolicyLayout>
  )
}
