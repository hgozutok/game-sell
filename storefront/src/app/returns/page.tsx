import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'
import { formatDate } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'

export function generateMetadata() {
  const t = getServerT()
  return {
    title: t('content.returns.metaTitle'),
    description: t('content.returns.metaDescription'),
  }
}

export default function ReturnsPage() {
  const t = getServerT()
  const locale = getServerLocale()

  return (
    <PolicyLayout
      title={t('content.shared.returnsPolicy')}
      lastUpdated={formatDate('2026-11-13', locale, { day: 'numeric', month: 'long', year: 'numeric' })}
    >
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">{t('content.returns.intro')}</p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.returns.s1Title')}</h2>
          <p className="mb-3">{t('content.returns.s1p1')}</p>
          <p>{t('content.returns.s1p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.returns.s2Title')}</h2>
          <p className="mb-3">{t('content.returns.s2p1')}</p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-3">
            <p className="text-yellow-100">
              <strong>{t('content.returns.s2WarnLabel')}</strong> {t('content.returns.s2WarnText')}
            </p>
          </div>
          <p>{t('content.returns.s2p2')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.returns.s3Title')}</h2>
          <div className="space-y-3">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">{t('content.returns.s3i1Label')}</strong>
                <p className="text-sm">{t('content.returns.s3i1Text')}</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">{t('content.returns.s3i2Label')}</strong>
                <p className="text-sm">{t('content.returns.s3i2Text')}</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">{t('content.returns.s3i3Label')}</strong>
                <p className="text-sm">{t('content.returns.s3i3Text')}</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">{t('content.returns.s3i4Label')}</strong>
                <p className="text-sm">{t('content.returns.s3i4Text')}</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-green-500 text-xl">✓</span>
              <div>
                <strong className="text-white">{t('content.returns.s3i5Label')}</strong>
                <p className="text-sm">{t('content.returns.s3i5Text')}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.returns.s4Title')}</h2>
          <div className="space-y-3">
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">{t('content.returns.s4i1Label')}</strong>
                <p className="text-sm">{t('content.returns.s4i1Text')}</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">{t('content.returns.s4i2Label')}</strong>
                <p className="text-sm">{t('content.returns.s4i2Text')}</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">{t('content.returns.s4i3Label')}</strong>
                <p className="text-sm">{t('content.returns.s4i3Text')}</p>
              </div>
            </div>
            <div className="bg-[#1a1d24] border border-gray-800 rounded-lg p-4 flex items-start gap-3">
              <span className="text-red-500 text-xl">✗</span>
              <div>
                <strong className="text-white">{t('content.returns.s4i4Label')}</strong>
                <p className="text-sm">{t('content.returns.s4i4Text')}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.returns.s5Title')}</h2>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">{t('content.returns.step1Title')}</h3>
              <ul className="list-disc ps-6 space-y-1 text-sm">
                <li>{t('content.returns.step1b1')}</li>
                <li>{t('content.returns.step1b2')}</li>
                <li>{t('content.returns.step1b3')}</li>
                <li>{t('content.returns.step1b4')}</li>
              </ul>
            </div>

            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">{t('content.returns.step2Title')}</h3>
              <p className="mb-4">{t('content.returns.step2Text')}</p>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="btn-secondary">
                  {t('content.shared.contactForm')}
                </Link>
                <a href="mailto:support@hupiplay.uk" className="btn-secondary">
                  support@hupiplay.uk
                </a>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#ff6b35]/10 to-[#f7931e]/10 border border-[#ff6b35]/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-3">{t('content.returns.step3Title')}</h3>
              <p>{t('content.returns.step3Text')}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.returns.s6Title')}</h2>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t('content.returns.s6b1')}</li>
            <li>{t('content.returns.s6b2')}</li>
            <li>{t('content.returns.s6b3')}</li>
            <li>{t('content.returns.s6b4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.returns.s7Title')}</h2>
          <p className="mb-4">{t('content.returns.s7p1')}</p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-yellow-200">
              <strong>{t('content.returns.s7WarnLabel')}</strong> {t('content.returns.s7WarnText')}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.returns.s8Title')}</h2>
          <p className="mb-4">{t('content.returns.s8p1')}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="btn-primary">
              {t('content.shared.contactSupport')}
            </Link>
            <Link href="/faq" className="btn-secondary">
              {t('content.shared.readFaq')}
            </Link>
            <Link href="/terms" className="btn-secondary">
              {t('content.shared.terms')}
            </Link>
          </div>
        </section>
      </div>
    </PolicyLayout>
  )
}
