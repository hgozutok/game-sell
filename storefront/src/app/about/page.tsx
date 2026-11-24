import type { Metadata } from 'next'
import Link from 'next/link'
import { formatDate } from '@/i18n'
import { getServerLocale, getServerT } from '@/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT()
  return {
    title: t('content.about.metaTitle'),
    description: t('content.about.metaDescription'),
  }
}

const COMPANY = {
  legalName: 'HUPI LIMITED',
  number: '16664659',
  incorporated: '2025-08-21',
  address:
    'Unit 13 Freeland Park, Wareham Road, Lytchett Matravers, Poole, England, BH16 6FA',
}

const ACTIVITIES = [
  { code: '47910', titleKey: 'content.about.activity1Title', descKey: 'content.about.activity1Desc' },
  { code: '46900', titleKey: 'content.about.activity2Title', descKey: 'content.about.activity2Desc' },
  { code: '46190', titleKey: 'content.about.activity3Title', descKey: 'content.about.activity3Desc' },
  { code: '62012', titleKey: 'content.about.activity4Title', descKey: 'content.about.activity4Desc' },
]

export default async function AboutPage() {
  const t = await getServerT()
  const locale = await getServerLocale()
  const incorporated = formatDate(COMPANY.incorporated, locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#1a1d24] via-[#15171c] to-[#0a0b0d] border-b border-gray-800 overflow-hidden">
        <div className="absolute top-0 end-1/4 w-96 h-96 bg-[#ff6b35] rounded-full filter blur-[140px] opacity-20" />
        <div className="absolute bottom-0 start-1/4 w-96 h-96 bg-purple-700 rounded-full filter blur-[140px] opacity-20" />
        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 bg-[#ff6b35]/15 border border-[#ff6b35]/40 rounded-full text-xs font-bold text-[#ff6b35]">
              {t('content.about.badge', { number: COMPANY.number })}
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-5">
              {t('content.about.heroTitle')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl leading-relaxed">
              {t('content.about.heroDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-14 max-w-5xl space-y-12">
        {/* Story + company card */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-3 space-y-5 text-gray-300 leading-relaxed">
            <h2 className="text-3xl font-black text-white">{t('content.about.whoTitle')}</h2>
            <p>{t('content.about.story1', { incorporated })}</p>
            <p>{t('content.about.story2')}</p>
            <p>{t('content.about.story3')}</p>
            <p>{t('content.about.story4')}</p>

            <div className="bg-[#15171c] border border-gray-800 rounded-xl p-5 text-sm">
              <p className="text-gray-400">
                {t('content.about.companyNoteBefore')}{' '}
                <strong className="text-white font-mono">{COMPANY.number}</strong>
                {t('content.about.companyNoteAfter')}
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        <section>
          <h2 className="text-3xl font-black text-white mb-6">{t('content.about.valuesTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: '⚡',
                title: t('content.about.value1Title'),
                text: t('content.about.value1Text'),
              },
              {
                icon: '🔍',
                title: t('content.about.value2Title'),
                text: t('content.about.value2Text'),
              },
              {
                icon: '🛡️',
                title: t('content.about.value3Title'),
                text: t('content.about.value3Text'),
              },
            ].map((value) => (
              <div key={value.title} className="gaming-card p-6">
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-lg font-bold text-white mb-2">{value.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{value.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Registered activities */}
        <section>
          <h2 className="text-3xl font-black text-white mb-3">{t('content.about.activitiesTitle')}</h2>
          <p className="text-gray-400 mb-6 max-w-3xl">{t('content.about.activitiesDesc')}</p>
          <div className="grid md:grid-cols-2 gap-4">
            {ACTIVITIES.map((activity) => (
              <div key={activity.code} className="bg-[#15171c] border border-gray-800 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono px-2 py-1 rounded bg-[#ff6b35]/15 border border-[#ff6b35]/30 text-[#ff6b35]">
                    {activity.code}
                  </span>
                  <h3 className="font-bold text-white">{t(activity.titleKey)}</h3>
                </div>
                <p className="text-sm text-gray-400">{t(activity.descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="gaming-card p-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-black text-white mb-3">{t('content.about.contactTitle')}</h2>
              <p className="text-gray-400 mb-4 leading-relaxed">{t('content.about.contactDesc')}</p>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  {t('content.about.contactEmailLabel')}{' '}
                  <a href="mailto:support@hupiplay.uk" className="text-[#ff6b35] hover:underline font-semibold">
                    support@hupiplay.uk
                  </a>
                </p>
                <p className="text-gray-300">
                  {t('content.about.contactAddressLabel')}{' '}
                  <span className="text-white">{COMPANY.address}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row md:justify-end gap-3">
              <Link href="/contact" className="btn-primary px-6 py-3 text-center">
                {t('content.shared.contactSupport')}
              </Link>
              <Link href="/products" className="btn-secondary px-6 py-3 text-center">
                {t('content.shared.browseGames')}
              </Link>
            </div>
          </div>
        </section>

        <p className="text-xs text-gray-500">
          {t('content.about.legalNoteStart')}{' '}
          <Link href="/terms" className="text-[#ff6b35] hover:underline">
            {t('content.shared.terms')}
          </Link>
          ,{' '}
          <Link href="/privacy" className="text-[#ff6b35] hover:underline">
            {t('content.shared.privacy')}
          </Link>{' '}
          {t('content.about.legalNoteJoin')}{' '}
          <Link href="/returns" className="text-[#ff6b35] hover:underline">
            {t('content.shared.returnsPolicy')}
          </Link>
          {t('content.about.legalNoteEnd')}
        </p>
      </div>
    </div>
  )
}
