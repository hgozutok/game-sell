import type { Metadata } from 'next'
import PolicyLayout from '@/components/layout/PolicyLayout'
import Link from 'next/link'
import { formatDate } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('content.delivery.metaTitle'),
    description: t('content.delivery.metaDescription'),
  }
}

export default async function DeliveryPage() {
  const t = await getServerT()
  const locale = await getServerLocale()

  return (
    <PolicyLayout
      title={t('content.delivery.title')}
      lastUpdated={formatDate('2026-11-13', locale, { day: 'numeric', month: 'long', year: 'numeric' })}
    >
      <div className="space-y-8 text-gray-300">
        <div className="bg-[#1a1d24] border border-[#ff6b35]/30 rounded-lg p-6">
          <p className="text-lg">{t('content.delivery.intro')}</p>
        </div>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s1Title')}</h2>
          <p>{t('content.delivery.s1Text')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s2Title')}</h2>
          <ul className="list-disc ps-6 space-y-2">
            <li>
              <strong className="text-white">{t('content.delivery.s2b1Label')}</strong>{' '}
              {t('content.delivery.s2b1Text')}
            </li>
            <li>
              <strong className="text-white">{t('content.delivery.s2b2Label')}</strong>{' '}
              {t('content.delivery.s2b2Text')}
            </li>
            <li>
              <strong className="text-white">{t('content.delivery.s2b3Label')}</strong>{' '}
              {t('content.delivery.s2b3Text')}
            </li>
          </ul>
          <p className="mt-3">{t('content.delivery.s2Note')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s3Title')}</h2>
          <p className="mb-3">{t('content.delivery.s3Intro')}</p>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t('content.delivery.s3b1')}</li>
            <li>{t('content.delivery.s3b2')}</li>
            <li>{t('content.delivery.s3b3')}</li>
            <li>{t('content.delivery.s3b4')}</li>
          </ul>
          <p className="mt-3">{t('content.delivery.s3Outro')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s4Title')}</h2>
          <p>{t('content.delivery.s4Text')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s5Title')}</h2>
          <p>
            {t('content.delivery.s5Text')}{' '}
            <Link href="/returns" className="text-[#ff6b35] hover:underline">
              {t('content.shared.returnsPolicy')}
            </Link>
            {t('content.delivery.s5End')}
          </p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s6Title')}</h2>
          <p className="mb-3">{t('content.delivery.s6Intro')}</p>
          <ul className="list-disc ps-6 space-y-2">
            <li>{t('content.delivery.s6b1')}</li>
            <li>{t('content.delivery.s6b2')}</li>
            <li>{t('content.delivery.s6b3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s7Title')}</h2>
          <p>{t('content.delivery.s7Text')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s8Title')}</h2>
          <p>{t('content.delivery.s8Text')}</p>
        </section>

        <section>
          <h2 className="text-3xl font-bold text-white mb-4">{t('content.delivery.s9Title')}</h2>
          <p className="mb-4">{t('content.delivery.s9Text')}</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/contact" className="btn-primary">
              {t('content.shared.contactSupport')}
            </Link>
            <a href="mailto:support@hupiplay.uk" className="btn-secondary">
              support@hupiplay.uk
            </a>
            <Link href="/faq" className="btn-secondary">
              {t('content.shared.readFaq')}
            </Link>
          </div>
        </section>
      </div>
    </PolicyLayout>
  )
}
