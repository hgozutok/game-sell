'use client'

import { useState } from 'react'
import PolicyLayout from '@/components/layout/PolicyLayout'
import { useT } from '@/components/useT'
import { useLocale } from '@/i18n/LocaleProvider'
import { formatDate } from '@/i18n'

const faqs = [
  {
    category: 'content.faq.cat1',
    questions: [
      { q: 'content.faq.q1', a: 'content.faq.a1' },
      { q: 'content.faq.q2', a: 'content.faq.a2' },
      { q: 'content.faq.q3', a: 'content.faq.a3' },
    ],
  },
  {
    category: 'content.faq.cat2',
    questions: [
      { q: 'content.faq.q4', a: 'content.faq.a4' },
      { q: 'content.faq.q5', a: 'content.faq.a5' },
      { q: 'content.faq.q6', a: 'content.faq.a6' },
    ],
  },
  {
    category: 'content.faq.cat3',
    questions: [
      { q: 'content.faq.q7', a: 'content.faq.a7' },
      { q: 'content.faq.q8', a: 'content.faq.a8' },
      { q: 'content.faq.q9', a: 'content.faq.a9' },
      { q: 'content.faq.q10', a: 'content.faq.a10' },
    ],
  },
  {
    category: 'content.faq.cat4',
    questions: [
      { q: 'content.faq.q11', a: 'content.faq.a11' },
      { q: 'content.faq.q12', a: 'content.faq.a12' },
      { q: 'content.faq.q13', a: 'content.faq.a13' },
    ],
  },
  {
    category: 'content.faq.cat5',
    questions: [
      { q: 'content.faq.q14', a: 'content.faq.a14' },
      { q: 'content.faq.q15', a: 'content.faq.a15' },
      { q: 'content.faq.q16', a: 'content.faq.a16' },
    ],
  },
]

export default function FAQPage() {
  const t = useT()
  const locale = useLocale()
  const [openIndex, setOpenIndex] = useState<string | null>(null)

  const toggleQuestion = (index: string) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <PolicyLayout
      title={t('content.faq.title')}
      lastUpdated={formatDate('2026-11-20', locale, { day: 'numeric', month: 'long', year: 'numeric' })}
    >
      <div className="space-y-8">
        <p className="text-gray-300 text-lg">
          {t('content.faq.intro')}{' '}
          <a href="/contact" className="text-[#ff6b35] hover:underline">
            {t('content.faq.introLink')}
          </a>
        </p>

        {faqs.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <h2 className="text-3xl font-bold text-white mb-6">{t(category.category)}</h2>
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
                      className="w-full text-start p-6 flex items-center justify-between gap-4"
                    >
                      <span className="font-bold text-white text-lg">{t(faq.q)}</span>
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
                        <p className="text-gray-300 leading-relaxed">{t(faq.a)}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="mt-12 bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">{t('content.faq.stillTitle')}</h3>
          <p className="text-gray-300 mb-6">{t('content.faq.stillText')}</p>
          <a href="/contact" className="btn-primary inline-block">
            {t('content.shared.contactSupport')}
          </a>
        </div>
      </div>
    </PolicyLayout>
  )
}
