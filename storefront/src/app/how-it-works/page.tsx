import type { Metadata } from 'next'
import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'
import { formatDate } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('content.how.metaTitle'),
    description: t('content.how.metaDescription'),
  }
}

export default async function HowItWorksPage() {
  const t = await getServerT()
  const locale = await getServerLocale()

  return (
    <PolicyLayout
      title={t('content.how.title')}
      lastUpdated={formatDate('2026-11-20', locale, { day: 'numeric', month: 'long', year: 'numeric' })}
    >
      <div className="space-y-12">
        <p className="text-gray-300 text-lg">{t('content.how.intro')}</p>

        {/* Steps */}
        <div className="space-y-8">
          {/* Step 1 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-[#ff6b35]/30">
              1
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">{t('content.how.step1Title')}</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">{t('content.how.step1Text')}</p>
              <ul className="list-disc ps-6 space-y-2 text-gray-300">
                <li>{t('content.how.step1b1')}</li>
                <li>{t('content.how.step1b2')}</li>
                <li>{t('content.how.step1b3')}</li>
                <li>{t('content.how.step1b4')}</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-[#ff6b35]/30">
              2
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">{t('content.how.step2Title')}</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">{t('content.how.step2Text')}</p>
              <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6 mb-4">
                <h3 className="text-xl font-bold text-white mb-3">{t('content.how.payMethodsTitle')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">💳</div>
                    <div className="text-sm text-gray-300">{t('content.how.payCards')}</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">🅿️</div>
                    <div className="text-sm text-gray-300">PayPal</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="text-sm text-gray-300">{t('content.how.payCrypto')}</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">🏦</div>
                    <div className="text-sm text-gray-300">{t('content.how.payBank')}</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">📱</div>
                    <div className="text-sm text-gray-300">{t('content.how.payMobile')}</div>
                  </div>
                  <div className="bg-[#15171c] border border-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">🌍</div>
                    <div className="text-sm text-gray-300">{t('content.how.payMore')}</div>
                  </div>
                </div>
              </div>
              <p className="text-gray-300 text-sm">
                <strong className="text-white">{t('content.how.securityLabel')}</strong>{' '}
                {t('content.how.securityText')}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-[#ff6b35]/30">
              3
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">{t('content.how.step3Title')}</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">{t('content.how.step3Text')}</p>
              <div className="space-y-4">
                <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">{t('content.how.emailTitle')}</h4>
                  <p className="text-gray-300 text-sm">{t('content.how.emailText')}</p>
                </div>
                <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">{t('content.how.accountTitle')}</h4>
                  <p className="text-gray-300 text-sm">{t('content.how.accountText')}</p>
                </div>
                <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4">
                  <h4 className="font-bold text-white mb-2">{t('content.how.activationTitle')}</h4>
                  <p className="text-gray-300 text-sm mb-3">{t('content.how.activationIntro')}</p>
                  <ul className="list-disc ps-6 space-y-1 text-gray-300 text-sm">
                    <li>
                      <strong className="text-white">Steam:</strong> {t('content.how.activationSteam')}
                    </li>
                    <li>
                      <strong className="text-white">Epic Games:</strong> {t('content.how.activationEpic')}
                    </li>
                    <li>
                      <strong className="text-white">Origin:</strong> {t('content.how.activationOrigin')}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-12 pt-12 border-t border-gray-800">
          <h2 className="text-3xl font-bold text-white mb-6">{t('content.how.whyTitle')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="text-xl font-bold text-white mb-2">{t('content.how.feature1Title')}</h3>
              <p className="text-gray-300">{t('content.how.feature1Text')}</p>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
              <div className="text-4xl mb-3">💯</div>
              <h3 className="text-xl font-bold text-white mb-2">{t('content.how.feature2Title')}</h3>
              <p className="text-gray-300">{t('content.how.feature2Text')}</p>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">{t('content.how.feature3Title')}</h3>
              <p className="text-gray-300">{t('content.how.feature3Text')}</p>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-6">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-xl font-bold text-white mb-2">{t('content.how.feature4Title')}</h3>
              <p className="text-gray-300">{t('content.how.feature4Text')}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#ff6b35] to-[#f7931e] rounded-2xl p-8 text-center">
          <h2 className="text-4xl font-black text-white mb-4">{t('content.how.ctaTitle')}</h2>
          <p className="text-white/90 text-lg mb-6">{t('content.how.ctaText')}</p>
          <Link href="/products" className="inline-block bg-white text-[#ff6b35] font-bold px-10 py-4 rounded-lg hover:bg-gray-100 transition uppercase tracking-wide text-lg">
            {t('content.how.ctaButton')}
          </Link>
        </div>
      </div>
    </PolicyLayout>
  )
}
